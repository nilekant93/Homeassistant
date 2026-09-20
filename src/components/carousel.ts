import { LitElement, html, css, type PropertyValues } from "lit";
import { customElement, property, state, queryAll } from "lit/decorators.js";
import { base } from "../theme";
import { icon } from "../icons";

export interface PanelMeta {
  key: string;
  label: string;
  icon: string;
}

/** Horizontal travel past which a drag counts as a swipe rather than a tap. */
const SWIPE_THRESHOLD = 56;
/** Below this the gesture is treated as a tap and the panel stays put. */
const DRAG_START = 10;

/**
 * Cross-fading panels with dots, a progress bar and swipe.
 *
 * Panels are slotted rather than passed in as templates so the carousel can
 * reach the real elements and hand each one an `active` flag — that is what
 * lets a panel run its own entrance animation at the right moment.
 */
@customElement("kt-carousel")
export class KtCarousel extends LitElement {
  @property({ attribute: false }) panels: PanelMeta[] = [];
  /** Time each panel is shown while rotating on its own. */
  @property({ type: Number }) intervalMs = 10_000;
  /** Time the current panel is held after any touch. */
  @property({ type: Number }) holdMs = 20_000;

  @state() private activeIndex = 0;
  /** "up" for automatic changes, left/right when a swipe set the direction. */
  @state() private enterFrom: "up" | "left" | "right" = "up";
  @state() private dragX = 0;

  @queryAll(".fill") private fills!: NodeListOf<HTMLElement>;

  private timer?: number;
  private progress?: Animation;
  private pointerId?: number;
  private startX = 0;
  private startY = 0;
  private dragging = false;
  private swallowClick = false;

  static styles = [
    base,
    css`
      :host {
        display: block;
      }

      .card {
        height: 100%;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        box-shadow: var(--shadow);
        padding: 22px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        overflow: hidden;
      }

      .stage {
        position: relative;
        flex: 1;
        min-height: 0;
        /* Vertical scrolling still belongs to the page; horizontal movement
           is ours, and saying so stops the browser claiming the gesture. */
        touch-action: pan-y;
      }

      .panel {
        position: absolute;
        inset: 0;
        opacity: 0;
        transition: opacity 260ms ease, transform 420ms cubic-bezier(0.22, 0.61, 0.36, 1);
      }

      .panel[data-enter="up"] {
        transform: translateY(12px);
      }
      .panel[data-enter="left"] {
        transform: translateX(-40px);
      }
      .panel[data-enter="right"] {
        transform: translateX(40px);
      }

      /* Only the visible panel may be touched; the others sit on top of each
         other and would otherwise swallow taps meant for the live one. */
      .panel[data-active] {
        opacity: 1;
        transform: none;
        pointer-events: auto;
      }

      .panel:not([data-active]) {
        pointer-events: none;
      }

      .dots {
        display: flex;
        gap: 32px;
        flex: 0 0 auto;
      }

      .dot-group {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 7px;
      }

      .dot {
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        background: var(--surface-2);
        color: var(--text-muted);
        transition: background 250ms ease, color 250ms ease, transform 250ms ease;
      }

      .dot[data-active] {
        background: var(--accent-amber-soft);
        color: var(--accent-amber);
        transform: scale(1.14);
      }

      .track {
        width: 44px;
        height: 4px;
        border-radius: 2px;
        background: var(--surface-2);
        overflow: hidden;
      }

      .fill {
        height: 100%;
        width: 100%;
        border-radius: 2px;
        background: var(--accent-amber);
        transform: scaleX(0);
        transform-origin: left center;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.scheduleNext(this.intervalMs);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopTimer();
    this.progress?.cancel();
  }

  protected updated(changed: PropertyValues) {
    if (changed.has("activeIndex") || changed.has("panels")) this.syncPanels();
  }

  /**
   * Hands the slotted elements their active flag. A panel uses it to play its
   * own entrance; the calendar simply ignores the property.
   */
  private syncPanels() {
    this.panels.forEach((_, i) => {
      const slot = this.renderRoot.querySelector<HTMLSlotElement>(`slot[name="p${i}"]`);
      for (const el of slot?.assignedElements() ?? []) {
        (el as HTMLElement & { active?: boolean }).active = i === this.activeIndex;
      }
    });
  }

  private stopTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  /** One timer for both modes: rotating uses the interval, a touch the hold. */
  private scheduleNext(delay: number) {
    this.stopTimer();
    this.timer = window.setTimeout(() => this.advance(1, "up"), delay);
    this.runProgress(delay);
  }

  /**
   * The bar is animated by the browser rather than re-rendered on a tick.
   * Ticking state ten times a second would re-render the whole page for a
   * four pixel bar; this runs on the compositor and costs nothing.
   */
  private runProgress(duration: number) {
    this.progress?.cancel();
    // Wait for the fill that belongs to the panel now showing.
    requestAnimationFrame(() => {
      const fill = this.fills?.[this.activeIndex];
      if (!fill) return;
      this.progress = fill.animate(
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        { duration, easing: "linear", fill: "forwards" }
      );
    });
  }

  private advance(step: number, from: "up" | "left" | "right", hold = false) {
    const count = this.panels.length;
    if (count < 2) return;

    this.enterFrom = from;
    this.activeIndex = (this.activeIndex + step + count) % count;
    this.scheduleNext(hold ? this.holdMs : this.intervalMs);
  }

  private goTo(index: number) {
    if (index === this.activeIndex) {
      // Touching the current panel is still a reason to stop rotating.
      this.scheduleNext(this.holdMs);
      return;
    }
    this.enterFrom = index > this.activeIndex ? "right" : "left";
    this.activeIndex = index;
    this.scheduleNext(this.holdMs);
  }

  /* ── Gestures ─────────────────────────────────────────────────────────── */

  private onPointerDown = (event: PointerEvent) => {
    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.dragging = false;
    // Any touch anywhere on the card holds the current panel, including the
    // calendar's own month arrows — otherwise browsing months would be
    // interrupted by the rotation.
    this.scheduleNext(this.holdMs);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== this.pointerId) return;
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;

    if (!this.dragging) {
      if (Math.abs(dx) < DRAG_START || Math.abs(dx) <= Math.abs(dy)) return;
      this.dragging = true;
      try {
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      } catch {
        // The pointer can already be gone; the drag still tracks fine.
      }
    }
    // Damped so the panel follows the finger without sliding right off.
    this.dragX = dx * 0.35;
  };

  private onPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== this.pointerId) return;
    const dx = event.clientX - this.startX;
    this.pointerId = undefined;
    this.dragX = 0;

    if (!this.dragging) return;
    this.dragging = false;
    // A drag that ends over a button must not also press it.
    this.swallowClick = true;

    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      this.advance(dx < 0 ? 1 : -1, dx < 0 ? "right" : "left", true);
    }
  };

  private onClickCapture = (event: Event) => {
    if (!this.swallowClick) return;
    this.swallowClick = false;
    event.stopPropagation();
    event.preventDefault();
  };

  render() {
    return html`
      <div class="card">
        <div
          class="stage"
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.onPointerUp}
          @pointercancel=${this.onPointerUp}
          @click=${{ handleEvent: this.onClickCapture, capture: true }}
        >
          ${this.panels.map(
            (_panel, i) => html`
              <div
                class="panel"
                data-enter=${this.enterFrom}
                ?data-active=${i === this.activeIndex}
                aria-hidden=${i === this.activeIndex ? "false" : "true"}
                style=${i === this.activeIndex && this.dragX
                  ? `transform: translateX(${this.dragX}px); transition: none`
                  : ""}
              >
                <slot name=${`p${i}`}></slot>
              </div>
            `
          )}
        </div>

        <div class="dots">
          ${this.panels.map(
            (panel, i) => html`
              <div class="dot-group">
                <button
                  class="dot"
                  ?data-active=${i === this.activeIndex}
                  aria-label=${panel.label}
                  aria-pressed=${i === this.activeIndex ? "true" : "false"}
                  @click=${() => this.goTo(i)}
                >
                  ${icon(panel.icon, 20)}
                </button>
                <div class="track"><div class="fill"></div></div>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-carousel": KtCarousel;
  }
}

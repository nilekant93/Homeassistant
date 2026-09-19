import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { base } from "../theme";

/** How long the slider keeps showing the dragged value after release. */
const SETTLE_MS = 1500;

/**
 * Brightness track with a thin visual bar and a tall invisible grab area.
 *
 * While a drag is in progress the slider shows its own value and ignores the
 * one coming from Home Assistant. Without that, the state echo that arrives
 * mid-drag — still carrying the old brightness — would yank the handle back
 * under the user's finger.
 */
@customElement("kt-brightness-slider")
export class KtBrightnessSlider extends LitElement {
  /** 0–100, from Home Assistant. */
  @property({ type: Number }) value = 0;
  @property() color = "var(--accent-amber)";

  @state() private dragValue: number | null = null;

  private settleTimer?: number;

  static styles = [
    base,
    css`
      :host {
        display: block;
      }

      .grab {
        position: relative;
        /* 64px here is 48dp once the canvas is scaled to 75% on the tablet. */
        height: 64px;
        display: flex;
        align-items: center;
        touch-action: none;
        cursor: pointer;
      }

      .track {
        position: relative;
        width: 100%;
        height: 14px;
        border-radius: 7px;
        background: var(--surface-2);
        overflow: visible;
      }

      .fill {
        position: absolute;
        inset: 0 auto 0 0;
        border-radius: 7px;
        transition: background 180ms ease;
      }

      .knob {
        position: absolute;
        top: 50%;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--surface);
        border: 2px solid var(--border);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        transform: translate(-50%, -50%);
      }

      /* No width transition while dragging: the handle must sit exactly under
         the finger, not ease towards it. */
      .grab:not([data-dragging]) .fill,
      .grab:not([data-dragging]) .knob {
        transition: left 160ms ease, width 160ms ease, background 180ms ease;
      }
    `,
  ];

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.settleTimer) clearTimeout(this.settleTimer);
  }

  private get shown() {
    return this.dragValue ?? this.value;
  }

  private pctFromEvent(event: PointerEvent, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(100, Math.round(ratio * 100)));
  }

  private emit(value: number, final: boolean) {
    this.dispatchEvent(
      new CustomEvent("brightness-change", {
        detail: { value, final },
        bubbles: true,
        composed: true,
      })
    );
  }

  private onPointerDown = (event: PointerEvent) => {
    const el = event.currentTarget as HTMLElement;
    el.setPointerCapture(event.pointerId);
    if (this.settleTimer) clearTimeout(this.settleTimer);

    const value = this.pctFromEvent(event, el);
    this.dragValue = value;
    this.emit(value, false);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (this.dragValue === null) return;
    const value = this.pctFromEvent(event, event.currentTarget as HTMLElement);
    if (value === this.dragValue) return;
    this.dragValue = value;
    this.emit(value, false);
  };

  private onPointerUp = (event: PointerEvent) => {
    if (this.dragValue === null) return;
    const el = event.currentTarget as HTMLElement;
    el.releasePointerCapture(event.pointerId);

    const value = this.dragValue;
    this.emit(value, true);

    // Hold the dragged value briefly so the lamp and bridge have time to
    // report back before the displayed value reverts to Home Assistant's.
    this.settleTimer = window.setTimeout(() => {
      this.dragValue = null;
    }, SETTLE_MS);
  };

  render() {
    const pct = this.shown;

    return html`
      <div
        class="grab"
        ?data-dragging=${this.dragValue !== null}
        role="slider"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow=${pct}
        aria-label="Kirkkaus"
        @pointerdown=${this.onPointerDown}
        @pointermove=${this.onPointerMove}
        @pointerup=${this.onPointerUp}
        @pointercancel=${this.onPointerUp}
      >
        <div class="track">
          <div class="fill" style=${`width: ${pct}%; background: ${this.color}`}></div>
          <div class="knob" style=${`left: ${pct}%`}></div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-brightness-slider": KtBrightnessSlider;
  }
}

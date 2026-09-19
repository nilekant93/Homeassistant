import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import { base } from "../theme";
import { icon } from "../icons";
import { swatchCss, type Swatch } from "../palette";

/**
 * Horizontally scrollable swatches with arrows at either end.
 *
 * Swiping is the natural gesture on a tablet, but nothing on screen says the
 * row continues past the edge — so the arrows earn their place as an
 * affordance, appearing only when there is actually more to reach.
 */
@customElement("kt-color-row")
export class KtColorRow extends LitElement {
  @property({ attribute: false }) swatches: Swatch[] = [];
  @property() selected?: string;
  /** Diameter in design pixels; 72 is 54dp once the canvas is scaled. */
  @property({ type: Number }) size = 72;

  @state() private canLeft = false;
  @state() private canRight = false;

  @query(".scroller") private scroller!: HTMLElement;

  private resizeObserver?: ResizeObserver;

  static styles = [
    base,
    css`
      :host {
        display: block;
      }

      .wrap {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .arrow {
        flex: 0 0 56px;
        height: 56px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
        background: var(--surface-2);
        transition: opacity 160ms ease;
      }

      .arrow[data-hidden] {
        opacity: 0;
        pointer-events: none;
      }

      .scroller {
        flex: 1;
        min-width: 0;
        display: flex;
        gap: 14px;
        overflow-x: auto;
        scroll-behavior: smooth;
        scroll-snap-type: x proximity;
        /* The row is dragged with a finger; a visible bar would only eat
           vertical space and never be used. */
        scrollbar-width: none;
        padding: 4px 2px;
      }

      .scroller::-webkit-scrollbar {
        display: none;
      }

      .swatch {
        flex: 0 0 auto;
        border-radius: 50%;
        scroll-snap-align: center;
        position: relative;
        border: 1px solid rgba(0, 0, 0, 0.08);
        transition: transform 140ms ease;
      }

      .swatch:active {
        transform: scale(0.94);
      }

      /* The ring sits outside the swatch so selection never changes its size. */
      .swatch[data-selected]::after {
        content: "";
        position: absolute;
        inset: -6px;
        border-radius: 50%;
        border: 3px solid var(--text);
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.resizeObserver = new ResizeObserver(() => this.updateArrows());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
  }

  protected firstUpdated() {
    this.resizeObserver?.observe(this.scroller);
    this.updateArrows();
  }

  protected updated(changed: PropertyValues) {
    this.updateArrows();
    if (changed.has("selected")) this.revealSelected(!changed.has("swatches"));
  }

  /**
   * The current colour is often well past the right edge of the row, so
   * nothing on screen tells you what is actually on. Bring it into view —
   * without animation on the first paint, so the row does not appear to
   * scroll by itself when the page opens.
   */
  private revealSelected(animate: boolean) {
    const index = this.swatches.findIndex((s) => s.id === this.selected);
    if (index < 0) return;

    // Deferred a frame: on the first paint the row has not been laid out at
    // its final width yet, and centring against the wrong width leaves the
    // selected swatch stranded at the edge.
    requestAnimationFrame(() => {
      const el = this.renderRoot.querySelectorAll(".swatch")[index];
      el?.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior: animate ? "smooth" : "auto",
      });
    });
  }

  private updateArrows() {
    const el = this.scroller;
    if (!el) return;
    const canLeft = el.scrollLeft > 4;
    const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    if (canLeft !== this.canLeft) this.canLeft = canLeft;
    if (canRight !== this.canRight) this.canRight = canRight;
  }

  private scrollByPage(direction: -1 | 1) {
    const el = this.scroller;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  private select(swatch: Swatch) {
    this.dispatchEvent(
      new CustomEvent("swatch-select", { detail: swatch, bubbles: true, composed: true })
    );
  }

  render() {
    return html`
      <div class="wrap">
        <button
          class="arrow"
          ?data-hidden=${!this.canLeft}
          aria-label="Edelliset värit"
          @click=${() => this.scrollByPage(-1)}
        >
          ${icon("chevronLeft", 22, 2)}
        </button>

        <div class="scroller" @scroll=${this.updateArrows}>
          ${this.swatches.map(
            (s) => html`
              <button
                class="swatch"
                ?data-selected=${s.id === this.selected}
                style=${`width: ${this.size}px; height: ${this.size}px; background: ${swatchCss(s)}`}
                title=${s.label}
                aria-label=${s.label}
                aria-pressed=${s.id === this.selected ? "true" : "false"}
                @click=${() => this.select(s)}
              ></button>
            `
          )}
        </div>

        ${this.swatches.length
          ? html`
              <button
                class="arrow"
                ?data-hidden=${!this.canRight}
                aria-label="Seuraavat värit"
                @click=${() => this.scrollByPage(1)}
              >
                ${icon("chevronRight", 22, 2)}
              </button>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-color-row": KtColorRow;
  }
}

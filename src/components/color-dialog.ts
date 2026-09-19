import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { base } from "../theme";
import { icon } from "../icons";
import { COLORS, WHITES, swatchCss, type Swatch } from "../palette";

/**
 * The full palette as a grid — whites first, then colours, same order as the
 * inline row so the two read as one set rather than two.
 *
 * Positioned absolutely inside the page rather than fixed to the window: the
 * whole canvas is scaled by a transform, and a fixed overlay would be laid
 * out against the unscaled viewport instead.
 */
@customElement("kt-color-dialog")
export class KtColorDialog extends LitElement {
  @property() selected?: string;

  static styles = [
    base,
    css`
      :host {
        position: absolute;
        inset: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .scrim {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
      }

      .panel {
        position: relative;
        width: 840px;
        max-height: 88%;
        overflow-y: auto;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 24px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
        padding: 28px 32px 32px;
      }

      header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 22px;
      }

      h2 {
        flex: 1;
        min-width: 0;
        margin: 0;
        font-family: var(--font-display);
        font-size: 24px;
        font-weight: 600;
        color: var(--text);
      }

      .close {
        width: 56px;
        height: 56px;
        flex: 0 0 56px;
        border-radius: 50%;
        background: var(--surface-2);
        color: var(--text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .group-label {
        font-size: 13px;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: var(--text-muted);
        font-weight: 600;
        margin-bottom: 14px;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(8, minmax(0, 1fr));
        gap: 18px;
        margin-bottom: 26px;
      }

      .grid:last-child {
        margin-bottom: 0;
      }

      .swatch {
        position: relative;
        width: 100%;
        aspect-ratio: 1;
        border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, 0.08);
        transition: transform 140ms ease;
      }

      .swatch:active {
        transform: scale(0.94);
      }

      .swatch[data-selected]::after {
        content: "";
        position: absolute;
        inset: -6px;
        border-radius: 50%;
        border: 3px solid var(--text);
      }
    `,
  ];

  private close = () => {
    this.dispatchEvent(new CustomEvent("dialog-close", { bubbles: true, composed: true }));
  };

  private select(swatch: Swatch) {
    this.dispatchEvent(
      new CustomEvent("swatch-select", { detail: swatch, bubbles: true, composed: true })
    );
  }

  private grid(swatches: Swatch[]) {
    return html`
      <div class="grid">
        ${swatches.map(
          (s) => html`
            <button
              class="swatch"
              ?data-selected=${s.id === this.selected}
              style=${`background: ${swatchCss(s)}`}
              title=${s.label}
              aria-label=${s.label}
              @click=${() => this.select(s)}
            ></button>
          `
        )}
      </div>
    `;
  }

  render() {
    return html`
      <div class="scrim" @click=${this.close}></div>
      <div class="panel" role="dialog" aria-label="Väripaletti">
        <header>
          <h2>Väripaletti</h2>
          <button class="close" aria-label="Sulje" @click=${this.close}>
            ${icon("close", 22, 2)}
          </button>
        </header>

        <div class="group-label">Valkoiset</div>
        ${this.grid(WHITES)}

        <div class="group-label">Värit</div>
        ${this.grid(COLORS)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-color-dialog": KtColorDialog;
  }
}

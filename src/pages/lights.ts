import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { base } from "../theme";
import type { HomeAssistant, LightsConfig } from "../types";

import "../components/light-hero";
import "../components/light-card";

@customElement("kt-page-lights")
export class KtPageLights extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) config: LightsConfig = {};

  static styles = [
    base,
    css`
      :host {
        display: block;
        height: 100%;
      }

      .page {
        height: 100%;
        padding: 40px 48px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      h1 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 30px;
        font-weight: 600;
        color: var(--text);
      }

      .subtitle {
        font-size: 15px;
        color: var(--text-muted);
        margin-top: 4px;
      }

      .section-label {
        font-size: 13px;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: var(--text-muted);
        font-weight: 600;
        margin-bottom: 12px;
      }

      .others-section {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }

      .others {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
      }
    `,
  ];

  render() {
    const { primary, others = [] } = this.config;

    return html`
      <div class="page">
        <div>
          <h1>Valot</h1>
          <div class="subtitle">Kirkkaus, väri ja pikakytkimet</div>
        </div>

        ${primary
          ? html`<kt-light-hero .hass=${this.hass} .config=${primary}></kt-light-hero>`
          : nothing}

        ${others.length
          ? html`
              <div class="others-section">
                <div class="section-label">Muut valot</div>
                <div class="others">
                  ${others.map(
                    (light) => html`
                      <kt-light-card
                        .hass=${this.hass}
                        .config=${{ ...light, style: light.style ?? "switch" }}
                      ></kt-light-card>
                    `
                  )}
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-page-lights": KtPageLights;
  }
}

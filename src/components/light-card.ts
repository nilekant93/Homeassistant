import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { base, switchStyles } from "../theme";
import { icon } from "../icons";
import { brightnessPct, colorName, isOn, lightColor } from "../format";
import type { HassEntity, HomeAssistant, LightConfig } from "../types";

/**
 * One light tile. A dimmable light shows a brightness bar tinted with the
 * light's own colour; a decorative light is the same tile without the bar.
 * Tapping anywhere toggles.
 */
@customElement("kt-light-card")
export class KtLightCard extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) config!: LightConfig;
  /**
   * "row" is the wide, short card used on the home grid; "tile" is the tall
   * square used where a card gets as much height as width.
   */
  @property() layout: "row" | "tile" = "row";

  static styles = [
    base,
    switchStyles,
    css`
      :host {
        display: block;
      }

      .card {
        width: 100%;
        height: 100%;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 20px 22px;
        box-shadow: var(--shadow);
        display: flex;
        flex-direction: column;
        text-align: left;
        transition: opacity 180ms ease;
      }

      .card[data-off] {
        opacity: 0.6;
      }

      /* Touch feedback stands in for the hover state a tablet never gets. */
      .card:active {
        transform: scale(0.985);
      }

      /* Controls at the top, identity at the bottom: at tile size the eye
         lands on the icon first and reads the label last. */
      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .spacer {
        flex: 1;
        min-height: 12px;
      }

      /* In row layout the identity sits beside the icon instead of under it,
         and the card only needs to be tall enough for one line of each. */
      .card[data-row] {
        justify-content: center;
        gap: 10px;
      }

      .card[data-row] .row {
        gap: 14px;
      }

      .card[data-row] .meta {
        flex: 1;
        min-width: 0;
      }

      .card[data-row] .icon-wrap {
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        border-radius: 13px;
      }

      .card[data-row] .name {
        font-size: 16px;
      }

      .card[data-row] .bar {
        margin-top: 0;
      }

      .icon-wrap {
        width: 52px;
        height: 52px;
        flex: 0 0 52px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 180ms ease, color 180ms ease;
      }

      .meta {
        min-width: 0;
      }

      .name {
        font-size: 18px;
        font-weight: 600;
        color: var(--text);
      }

      .state {
        font-size: 14px;
        color: var(--text-muted);
        margin-top: 3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .bar {
        height: 8px;
        border-radius: 4px;
        background: var(--surface-2);
        overflow: hidden;
        margin-top: 16px;
      }

      .fill {
        height: 100%;
        border-radius: 3px;
        transition: width 220ms ease, background 180ms ease;
      }
    `,
  ];

  private get entity(): HassEntity | undefined {
    return this.hass?.states[this.config.entity];
  }

  private toggle = () => {
    this.hass.callService("light", "toggle", {}, { entity_id: this.config.entity });
  };

  private stateLabel(e: HassEntity | undefined, dimmer: boolean): string {
    if (!e) return "Ei saatavilla";
    if (!isOn(e)) return "Pois päältä";
    if (!dimmer) return "Päällä";

    const parts = ["Päällä", `${brightnessPct(e)} %`];
    const color = colorName(e);
    if (color) parts.push(color);
    return parts.join(" · ");
  }

  render() {
    const e = this.entity;
    const dimmer = this.config.style !== "switch";
    const on = isOn(e);

    // A dimmable light carries its own colour through the tile; the decorative
    // ones share the teal accent so the two groups stay distinguishable.
    const accent = dimmer ? lightColor(e) : "var(--accent-teal)";
    const accentSoft = dimmer ? `${lightColor(e)}33` : "var(--accent-teal-soft)";
    const row = this.layout === "row";

    const identity = html`
      <div class="meta">
        <div class="name">
          ${this.config.name ?? e?.attributes.friendly_name ?? this.config.entity}
        </div>
        <div class="state">${this.stateLabel(e, dimmer)}</div>
      </div>
    `;

    return html`
      <button
        class="card"
        ?data-row=${row}
        ?data-dimmer=${dimmer}
        ?data-off=${!on}
        aria-pressed=${on ? "true" : "false"}
        aria-label=${this.config.name ?? this.config.entity}
        @click=${this.toggle}
      >
        <div class="row">
          <div
            class="icon-wrap"
            style=${`background: ${on ? accentSoft : "var(--surface-2)"};
                     color: ${on ? accent : "var(--text-muted)"}`}
          >
            ${icon(this.config.icon ?? "bulb", row ? 22 : 26)}
          </div>

          ${row ? identity : nothing}

          <div class="track" ?data-on=${on} style=${`background: ${on ? accent : "var(--border)"}`}>
            <div class="knob"></div>
          </div>
        </div>

        ${row ? nothing : html`<div class="spacer"></div>${identity}`}

        ${dimmer
          ? html`
              <div class="bar">
                <div
                  class="fill"
                  style=${`width: ${on ? brightnessPct(e) : 0}%; background: ${accent}`}
                ></div>
              </div>
            `
          : nothing}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-light-card": KtLightCard;
  }
}

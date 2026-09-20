import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { base } from "../theme";
import { weatherIcon } from "../icons";
import { conditionLabel, roundTemp } from "../format";
import { playStagger } from "./stagger";
import type { ForecastDay, HassEntity } from "../types";

/** Current conditions on the left, the next few hours beside them. */
@customElement("kt-weather-now")
export class KtWeatherNow extends LitElement {
  @property({ attribute: false }) entity?: HassEntity;
  @property({ attribute: false }) hourly: ForecastDay[] = [];
  @property({ attribute: false }) today?: ForecastDay;
  @property({ type: Number }) hours = 6;
  /** Set by the carousel; true while this panel is the one on screen. */
  @property({ type: Boolean }) active = false;

  static styles = [
    base,
    css`
      :host {
        display: block;
        height: 100%;
      }

      .row {
        height: 100%;
        display: flex;
        align-items: center;
        gap: 26px;
      }

      .now {
        flex: 0 0 236px;
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .now svg {
        flex: 0 0 52px;
        color: var(--text);
      }

      .temp {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 46px;
        line-height: 1;
        color: var(--text);
      }

      .summary {
        font-size: 13px;
        color: var(--text-muted);
        margin-top: 6px;
      }

      .divider {
        flex: 0 0 1px;
        width: 1px;
        align-self: stretch;
        background: var(--border);
      }

      .hours {
        flex: 1;
        min-width: 0;
        display: flex;
        gap: 6px;
      }

      .slot {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .slot-time {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-muted);
      }

      .slot svg {
        color: var(--text);
      }

      .slot-temp {
        font-size: 15px;
        color: var(--text);
      }
    `,
  ];

  protected updated(changed: PropertyValues) {
    if (changed.has("active") && this.active) playStagger(this.renderRoot);
  }

  render() {
    const e = this.entity;
    const summary = [
      conditionLabel(e?.state),
      this.today?.temperature !== undefined
        ? `Ylin ${roundTemp(this.today.temperature)}`
        : undefined,
      this.today?.templow !== undefined ? `Alin ${roundTemp(this.today.templow)}` : undefined,
    ]
      .filter(Boolean)
      .join(" · ");

    return html`
      <div class="row">
        <div class="now" data-stagger>
          ${weatherIcon(e?.state, 52)}
          <div>
            <div class="temp">${roundTemp(e?.attributes.temperature as number | undefined)}</div>
            <div class="summary">${summary}</div>
          </div>
        </div>

        ${this.hourly.length ? html`<div class="divider"></div>` : nothing}

        <div class="hours">
          ${this.hourly.slice(0, this.hours).map((entry) => {
            const at = new Date(entry.datetime);
            return html`
              <div class="slot" data-stagger>
                <div class="slot-time">
                  ${String(at.getHours()).padStart(2, "0")}:00
                </div>
                ${weatherIcon(entry.condition, 28, 1.6)}
                <div class="slot-temp">${roundTemp(entry.temperature)}</div>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-weather-now": KtWeatherNow;
  }
}

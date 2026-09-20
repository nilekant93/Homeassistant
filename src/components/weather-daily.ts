import { LitElement, html, css, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { base } from "../theme";
import { weatherIcon } from "../icons";
import { conditionLabel, roundTemp, weekdayShort } from "../format";
import { playStagger } from "./stagger";
import type { ForecastDay } from "../types";

/** The coming days, one column each. */
@customElement("kt-weather-daily")
export class KtWeatherDaily extends LitElement {
  @property({ attribute: false }) daily: ForecastDay[] = [];
  @property({ type: Number }) days = 6;
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
        align-items: stretch;
        gap: 10px;
      }

      .day {
        flex: 1;
        min-width: 0;
        border-radius: 16px;
        background: var(--surface-2);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 12px 8px;
      }

      .name {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-muted);
      }

      .day svg {
        color: var(--text);
      }

      .temps {
        font-size: 16px;
        color: var(--text);
        white-space: nowrap;
      }

      .low {
        color: var(--text-muted);
      }

      .condition {
        font-size: 12px;
        color: var(--text-muted);
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
      }
    `,
  ];

  protected updated(changed: PropertyValues) {
    if (changed.has("active") && this.active) playStagger(this.renderRoot);
  }

  render() {
    // Index 0 is today, already summarised on the previous panel.
    return html`
      <div class="row">
        ${this.daily.slice(1, this.days + 1).map((entry) => {
          const date = new Date(entry.datetime);
          return html`
            <div class="day" data-stagger>
              <div class="name">${weekdayShort(date)}</div>
              ${weatherIcon(entry.condition, 34, 1.5)}
              <div class="temps">
                ${roundTemp(entry.temperature)}
                <span class="low">${roundTemp(entry.templow)}</span>
              </div>
              <div class="condition">${conditionLabel(entry.condition)}</div>
            </div>
          `;
        })}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-weather-daily": KtWeatherDaily;
  }
}

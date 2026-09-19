import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { base } from "../theme";
import { weatherIcon } from "../icons";
import { conditionLabel, hourShort, roundTemp, weekdayShort } from "../format";
import type { ForecastDay, HomeAssistant } from "../types";

/**
 * Current conditions, the next few hours, and the next few days.
 *
 * Since 2023.9 forecasts are not entity attributes — they arrive over a
 * websocket subscription, and `weather/subscribe_forecast` carries one type
 * per subscription, so hourly and daily need one each.
 */
@customElement("kt-weather-card")
export class KtWeatherCard extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property() entityId!: string;
  @property({ type: Number }) days = 5;
  @property({ type: Number }) hours = 8;

  @state() private daily: ForecastDay[] = [];
  @state() private hourly: ForecastDay[] = [];

  private unsubs: Array<() => Promise<void>> = [];
  private subscribedTo?: string;

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
        padding: 22px 26px;
        box-shadow: var(--shadow);
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .now {
        display: flex;
        align-items: center;
        gap: 22px;
      }

      .now svg {
        flex: 0 0 56px;
        color: var(--text);
      }

      .temp {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 52px;
        line-height: 1;
        color: var(--text);
      }

      .summary {
        font-size: 15px;
        color: var(--text-muted);
        margin-top: 6px;
      }

      /* Hours and days read as separate bands without needing labels: the
         rules carry the separation, and "22" versus "Su" says the rest. */
      .strip {
        flex: 1;
        min-height: 0;
        display: flex;
        gap: 4px;
        border-top: 1px solid var(--border);
        padding-top: 12px;
        align-items: center;
      }

      .slot {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
      }

      .slot-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-muted);
      }

      .slot svg {
        color: var(--text);
      }

      .slot-temps {
        font-size: 15px;
        color: var(--text);
        white-space: nowrap;
      }

      .low {
        color: var(--text-muted);
      }
    `,
  ];

  disconnectedCallback() {
    super.disconnectedCallback();
    void this.unsubscribeAll();
  }

  protected willUpdate(changed: PropertyValues) {
    // `hass` is replaced on every state change; resubscribing on each one
    // would tear the subscriptions down and rebuild them constantly.
    if (changed.has("hass") || changed.has("entityId")) {
      if (this.hass && this.entityId && this.subscribedTo !== this.entityId) {
        void this.subscribeForecasts();
      }
    }
  }

  private async subscribeForecasts() {
    await this.unsubscribeAll();
    const entityId = this.entityId;
    this.subscribedTo = entityId;

    for (const forecastType of ["daily", "hourly"] as const) {
      try {
        const unsub = await this.hass.connection.subscribeMessage<{
          forecast: ForecastDay[];
        }>(
          (event) => {
            const forecast = event.forecast ?? [];
            if (forecastType === "daily") this.daily = forecast;
            else this.hourly = forecast;
          },
          {
            type: "weather/subscribe_forecast",
            forecast_type: forecastType,
            entity_id: entityId,
          }
        );
        this.unsubs.push(unsub);
      } catch {
        // Not every weather entity offers both kinds; the row for a type it
        // does not support simply stays hidden.
      }
    }
  }

  private async unsubscribeAll() {
    const unsubs = this.unsubs;
    this.unsubs = [];
    this.subscribedTo = undefined;
    for (const unsub of unsubs) {
      try {
        await unsub();
      } catch {
        /* connection already gone */
      }
    }
  }

  private strip(
    entries: ForecastDay[],
    label: (d: Date) => string,
    showLow: boolean
  ) {
    if (!entries.length) return nothing;

    return html`
      <div class="strip">
        ${entries.map((entry) => {
          const date = new Date(entry.datetime);
          return html`
            <div class="slot">
              <div class="slot-name">${label(date)}</div>
              ${weatherIcon(entry.condition, 28, 1.6)}
              <div class="slot-temps">
                ${roundTemp(entry.temperature)}
                ${showLow && entry.templow !== undefined
                  ? html`<span class="low">${roundTemp(entry.templow)}</span>`
                  : nothing}
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  render() {
    const e = this.hass?.states[this.entityId];
    const temperature = e?.attributes.temperature as number | undefined;

    // Today's high and low come from the first daily entry; the entity itself
    // carries only the current reading.
    const today = this.daily[0];
    const summary = [
      conditionLabel(e?.state),
      today?.temperature !== undefined ? `Ylin ${roundTemp(today.temperature)}` : undefined,
      today?.templow !== undefined ? `Alin ${roundTemp(today.templow)}` : undefined,
    ]
      .filter(Boolean)
      .join(" · ");

    return html`
      <div class="card">
        <div class="now">
          ${weatherIcon(e?.state, 56)}
          <div>
            <div class="temp">${roundTemp(temperature)}</div>
            <div class="summary">${summary}</div>
          </div>
        </div>

        ${this.strip(this.hourly.slice(0, this.hours), hourShort, false)}
        ${this.strip(this.daily.slice(1, this.days + 1), weekdayShort, true)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-weather-card": KtWeatherCard;
  }
}

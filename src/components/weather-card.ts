import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { base } from "../theme";
import { weatherIcon } from "../icons";
import { conditionLabel, roundTemp, weekdayShort } from "../format";
import type { ForecastDay, HomeAssistant } from "../types";

/**
 * Current conditions plus a short daily outlook.
 *
 * Since 2023.9 forecasts are no longer entity attributes — they arrive over a
 * websocket subscription, which this card owns for its own lifetime.
 */
@customElement("kt-weather-card")
export class KtWeatherCard extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property() entityId!: string;
  @property({ type: Number }) days = 5;

  @state() private forecast: ForecastDay[] = [];

  private unsubscribe?: () => Promise<void>;
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
        justify-content: space-between;
        gap: 18px;
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

      .outlook {
        display: flex;
        gap: 4px;
        border-top: 1px solid var(--border);
        padding-top: 14px;
      }

      .day {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }

      .day-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-muted);
      }

      .day svg {
        color: var(--text);
      }

      .day-temps {
        font-size: 15px;
        color: var(--text);
        white-space: nowrap;
      }

      .day-low {
        color: var(--text-muted);
      }
    `,
  ];

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribeForecast();
  }

  protected willUpdate(changed: PropertyValues) {
    // `hass` is replaced on every state change, so resubscribing on each one
    // would tear down and rebuild the subscription constantly.
    if (changed.has("hass") || changed.has("entityId")) {
      if (this.hass && this.entityId && this.subscribedTo !== this.entityId) {
        void this.subscribeForecast();
      }
    }
  }

  private async subscribeForecast() {
    await this.unsubscribeForecast();
    const entityId = this.entityId;
    this.subscribedTo = entityId;

    try {
      this.unsubscribe = await this.hass.connection.subscribeMessage<{
        forecast: ForecastDay[];
      }>(
        (event) => {
          this.forecast = event.forecast ?? [];
        },
        {
          type: "weather/subscribe_forecast",
          forecast_type: "daily",
          entity_id: entityId,
        }
      );
    } catch {
      // An entity without daily forecast support leaves the outlook hidden
      // rather than breaking the card.
      this.subscribedTo = undefined;
    }
  }

  private async unsubscribeForecast() {
    const unsub = this.unsubscribe;
    this.unsubscribe = undefined;
    this.subscribedTo = undefined;
    if (unsub) {
      try {
        await unsub();
      } catch {
        /* connection already gone */
      }
    }
  }

  render() {
    const e = this.hass?.states[this.entityId];
    const temperature = e?.attributes.temperature as number | undefined;

    // Today's high and low come from the first forecast day; the entity itself
    // only carries the current reading.
    const today = this.forecast[0];
    const summary = [
      conditionLabel(e?.state),
      today?.temperature !== undefined ? `Ylin ${roundTemp(today.temperature)}` : undefined,
      today?.templow !== undefined ? `Alin ${roundTemp(today.templow)}` : undefined,
    ]
      .filter(Boolean)
      .join(" · ");

    const outlook = this.forecast.slice(1, this.days + 1);

    return html`
      <div class="card">
        <div class="now">
          ${weatherIcon(e?.state, 56)}
          <div>
            <div class="temp">${roundTemp(temperature)}</div>
            <div class="summary">${summary}</div>
          </div>
        </div>

        ${outlook.length
          ? html`
              <div class="outlook">
                ${outlook.map((day) => {
                  const date = new Date(day.datetime);
                  return html`
                    <div class="day">
                      <div class="day-name">${weekdayShort(date)}</div>
                      ${weatherIcon(day.condition, 30, 1.6)}
                      <div class="day-temps">
                        ${roundTemp(day.temperature)}
                        <span class="day-low">${roundTemp(day.templow)}</span>
                      </div>
                    </div>
                  `;
                })}
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-weather-card": KtWeatherCard;
  }
}

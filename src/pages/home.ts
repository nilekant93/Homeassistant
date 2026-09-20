import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { base } from "../theme";
import { clockTime, longDate } from "../format";
import type { ForecastDay, HomeConfig, HomeAssistant } from "../types";
import type { PanelMeta } from "../components/carousel";

import "../components/carousel";
import "../components/light-card";
import "../components/weather-now";
import "../components/weather-daily";
import "../components/calendar-panel";

/** Ticks often enough that the displayed minute is never visibly stale. */
const TICK_MS = 10_000;

@customElement("kt-page-home")
export class KtPageHome extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) config: HomeConfig = {};

  @state() private now = new Date();
  @state() private hourly: ForecastDay[] = [];
  @state() private daily: ForecastDay[] = [];

  private timer?: number;
  private unsubs: Array<() => Promise<void>> = [];
  private subscribedTo?: string;

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
        gap: 22px;
      }

      .clock {
        flex: 0 0 auto;
      }

      .time {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 100px;
        line-height: 1;
        letter-spacing: -2px;
        color: var(--text);
        font-variant-numeric: tabular-nums;
      }

      .date {
        font-size: 17px;
        color: var(--text-muted);
        margin-top: 8px;
      }

      kt-carousel {
        flex: 0 0 300px;
      }

      .lights-section {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }

      .section-label {
        font-size: 13px;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: var(--text-muted);
        font-weight: 600;
        margin-bottom: 12px;
      }

      .lights {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-auto-rows: 1fr;
        gap: 14px;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.timer = window.setInterval(() => (this.now = new Date()), TICK_MS);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.timer) clearInterval(this.timer);
    void this.unsubscribeAll();
  }

  protected willUpdate(changed: PropertyValues) {
    if (!changed.has("hass") && !changed.has("config")) return;

    const entityId = this.config.weather?.entity;
    if (this.hass && entityId && this.subscribedTo !== entityId) {
      void this.subscribeForecasts(entityId);
    }
  }

  /**
   * Both weather panels read from here rather than subscribing themselves.
   * `weather/subscribe_forecast` carries one type per subscription, and two
   * self-subscribing panels would open four where two will do.
   */
  private async subscribeForecasts(entityId: string) {
    await this.unsubscribeAll();
    this.subscribedTo = entityId;

    for (const forecastType of ["hourly", "daily"] as const) {
      try {
        const unsub = await this.hass.connection.subscribeMessage<{
          forecast: ForecastDay[];
        }>(
          (event) => {
            const forecast = event.forecast ?? [];
            if (forecastType === "hourly") this.hourly = forecast;
            else this.daily = forecast;
          },
          {
            type: "weather/subscribe_forecast",
            forecast_type: forecastType,
            entity_id: entityId,
          }
        );
        this.unsubs.push(unsub);
      } catch {
        // A type the entity does not offer simply leaves its panel empty.
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

  render() {
    const { clock, weather, calendar, lights = [], carousel } = this.config;

    const panels: PanelMeta[] = [];
    if (weather?.entity) {
      panels.push({ key: "now", label: "Sää", icon: "sun" });
      panels.push({ key: "daily", label: "Ennuste", icon: "cloud" });
    }
    if (calendar) panels.push({ key: "calendar", label: "Kalenteri", icon: "calendar" });

    // Slot names are positional, so the panels and their content must be
    // built from the same list in the same order.
    const slotOf = (key: string) => `p${panels.findIndex((p) => p.key === key)}`;

    return html`
      <div class="page">
        <div class="clock">
          <div class="time">${clockTime(this.now)}</div>
          ${clock?.show_weekday === false
            ? nothing
            : html`<div class="date">${longDate(this.now)}</div>`}
        </div>

        ${panels.length
          ? html`
              <kt-carousel
                .panels=${panels}
                .intervalMs=${(carousel?.interval_seconds ?? 10) * 1000}
                .holdMs=${(carousel?.hold_seconds ?? 20) * 1000}
              >
                ${weather?.entity
                  ? html`
                      <kt-weather-now
                        slot=${slotOf("now")}
                        .entity=${this.hass?.states[weather.entity]}
                        .hourly=${this.hourly}
                        .today=${this.daily[0]}
                        .hours=${weather.forecast_hours ?? 6}
                      ></kt-weather-now>
                      <kt-weather-daily
                        slot=${slotOf("daily")}
                        .daily=${this.daily}
                        .days=${weather.forecast_days ?? 6}
                      ></kt-weather-daily>
                    `
                  : nothing}
                ${calendar
                  ? html`
                      <kt-calendar-panel
                        slot=${slotOf("calendar")}
                        bare
                        .hass=${this.hass}
                        .nextEventFrom=${calendar.next_event_from}
                        .showWeekNumbers=${calendar.show_week_numbers ?? true}
                      ></kt-calendar-panel>
                    `
                  : nothing}
              </kt-carousel>
            `
          : nothing}

        ${lights.length
          ? html`
              <div class="lights-section">
                <div class="section-label">Valot</div>
                <div class="lights">
                  ${lights.map(
                    (light) => html`
                      <kt-light-card
                        layout="row"
                        .hass=${this.hass}
                        .config=${light}
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
    "kt-page-home": KtPageHome;
  }
}

import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { base } from "../theme";
import { clockTime, longDate } from "../format";
import type { HomeConfig, HomeAssistant } from "../types";

import "../components/light-card";
import "../components/weather-card";
import "../components/calendar-panel";

/** Ticks often enough that the displayed minute is never visibly stale. */
const TICK_MS = 10_000;

@customElement("kt-page-home")
export class KtPageHome extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) config: HomeConfig = {};

  @state() private now = new Date();

  private timer?: number;

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
        gap: 26px;
      }

      /* Upper band: clock and weather on the left, calendar on the right.
         Both columns stretch to this height, which is what keeps the bottom
         of the calendar level with the bottom of the weather card — and what
         stops the calendar running the full length of the screen. */
      .top {
        flex: 0 0 444px;
        display: flex;
        gap: 32px;
      }

      .top-left {
        flex: 1;
        min-width: 0;
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

      kt-weather-card {
        flex: 1;
        min-width: 0;
        min-height: 0;
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

      /* One row across the full width. Four tiles of roughly 290 × 290
         instead of the cramped 2 × 2 grid that only had half the width. */
      .lights {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
      }

      .calendar {
        flex: 0 0 408px;
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
  }

  render() {
    const { clock, weather, calendar, lights = [] } = this.config;

    return html`
      <div class="page">
        <div class="top">
          <div class="top-left">
            <div class="clock">
              <div class="time">${clockTime(this.now)}</div>
              ${clock?.show_weekday === false
                ? nothing
                : html`<div class="date">${longDate(this.now)}</div>`}
            </div>

            ${weather?.entity
              ? html`
                  <kt-weather-card
                    .hass=${this.hass}
                    .entityId=${weather.entity}
                    .days=${weather.forecast_days ?? 5}
                    .hours=${weather.forecast_hours ?? 8}
                  ></kt-weather-card>
                `
              : nothing}
          </div>

          ${calendar
            ? html`
                <div class="calendar">
                  <kt-calendar-panel
                    .hass=${this.hass}
                    .nextEventFrom=${calendar.next_event_from}
                    .showWeekNumbers=${calendar.show_week_numbers ?? true}
                  ></kt-calendar-panel>
                </div>
              `
            : nothing}
        </div>

        ${lights.length
          ? html`
              <div class="lights-section">
                <div class="section-label">Valot</div>
                <div class="lights">
                  ${lights.map(
                    (light) => html`
                      <kt-light-card .hass=${this.hass} .config=${light}></kt-light-card>
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

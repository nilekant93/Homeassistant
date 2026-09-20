import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { base } from "../theme";
import { weatherIcon } from "../icons";
import { conditionLabel, roundTemp, weekdayShort } from "../format";
import { playStagger } from "./stagger";
import type { ForecastDay, HassEntity } from "../types";

/**
 * Current conditions on the left, a forecast strip on the right.
 *
 * Both carousel weather panels share this: they differ only in what the
 * strip holds, so the "now" block stays put as the panels change and the
 * switch reads as the forecast changing rather than the whole card.
 */
@customElement("kt-weather-panel")
export class KtWeatherPanel extends LitElement {
  @property({ attribute: false }) entity?: HassEntity;
  @property({ attribute: false }) entries: ForecastDay[] = [];
  @property({ attribute: false }) today?: ForecastDay;
  @property() mode: "hourly" | "daily" = "hourly";
  @property({ type: Number }) count = 6;
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

      .strip {
        flex: 1;
        min-width: 0;
        display: flex;
        gap: 8px;
      }

      .slot {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 9px;
      }

      /* The daily slots get a surface of their own; the hourly ones stay
         bare, which keeps the two panels from looking interchangeable. */
      .slot[data-boxed] {
        border-radius: 14px;
        background: var(--surface-2);
        padding: 12px 6px;
      }

      .slot-label {
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
        white-space: nowrap;
      }

      .low {
        color: var(--text-muted);
      }
    `,
  ];

  protected updated(changed: PropertyValues) {
    if (changed.has("active") && this.active) playStagger(this.renderRoot);
  }

  private label(entry: ForecastDay) {
    const at = new Date(entry.datetime);
    return this.mode === "hourly"
      ? `${String(at.getHours()).padStart(2, "0")}:00`
      : weekdayShort(at);
  }

  render() {
    const e = this.entity;
    const daily = this.mode === "daily";

    const summary = [
      conditionLabel(e?.state),
      this.today?.temperature !== undefined
        ? `Ylin ${roundTemp(this.today.temperature)}`
        : undefined,
      this.today?.templow !== undefined ? `Alin ${roundTemp(this.today.templow)}` : undefined,
    ]
      .filter(Boolean)
      .join(" · ");

    // Index 0 of the daily forecast is today, already summarised on the left.
    const entries = daily
      ? this.entries.slice(1, this.count + 1)
      : this.entries.slice(0, this.count);

    return html`
      <div class="row">
        <div class="now" data-stagger>
          ${weatherIcon(e?.state, 52)}
          <div>
            <div class="temp">${roundTemp(e?.attributes.temperature as number | undefined)}</div>
            <div class="summary">${summary}</div>
          </div>
        </div>

        ${entries.length ? html`<div class="divider"></div>` : nothing}

        <div class="strip">
          ${entries.map(
            (entry) => html`
              <div class="slot" ?data-boxed=${daily} data-stagger>
                <div class="slot-label">${this.label(entry)}</div>
                ${weatherIcon(entry.condition, daily ? 32 : 28, 1.6)}
                <div class="slot-temp">
                  ${roundTemp(entry.temperature)}
                  ${daily && entry.templow !== undefined
                    ? html`<span class="low">${roundTemp(entry.templow)}</span>`
                    : nothing}
                </div>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-weather-panel": KtWeatherPanel;
  }
}

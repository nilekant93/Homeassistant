import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { base } from "../theme";
import { icon } from "../icons";
import { isoWeek, monthGrid, monthTitle, sameDay, shortDate } from "../format";
import type { CalendarEvent, HomeAssistant } from "../types";

const WEEKDAYS = ["MA", "TI", "KE", "TO", "PE", "LA", "SU"];
const LOOKAHEAD_DAYS = 240;
const REFRESH_MS = 60 * 60 * 1000;

@customElement("kt-calendar-panel")
export class KtCalendarPanel extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  /** Calendar entity the footer line reads its next event from. */
  @property() nextEventFrom?: string;
  @property({ type: Boolean }) showWeekNumbers = true;
  /** Drops the card chrome for use inside another card, such as the carousel. */
  @property({ type: Boolean }) bare = false;

  @state() private cursor = new Date();
  @state() private today = new Date();
  @state() private nextEvent?: { summary: string; date: Date };

  private refreshTimer?: number;
  private fetchedFor?: string;

  static styles = [
    base,
    css`
      :host {
        display: block;
        height: 100%;
      }

      .panel {
        height: 100%;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 22px 22px 18px;
        box-shadow: var(--shadow);
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .panel[data-bare] {
        background: none;
        border: none;
        border-radius: 0;
        padding: 0;
        box-shadow: none;
        gap: 7px;
      }

      /* Inside the carousel a week row is about 26px, so the full-size
         circle would be taller than the row it marks. */
      .panel[data-bare] .today-mark {
        width: 24px;
        height: 24px;
        font-size: 14px;
      }

      header {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .month {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 19px;
        color: var(--text);
        flex: 1;
        min-width: 0;
      }

      /* These controls are small by design. Rather than grow them, each gets
         an invisible tap area via ::after, which sits outside the layout box
         and so reaches Android's 48dp minimum without shifting the header. */
      .today-btn,
      .step {
        position: relative;
      }

      .today-btn::after,
      .step::after {
        content: "";
        position: absolute;
        inset: -18px -10px;
      }

      .today-btn {
        border: 1px solid var(--border);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 600;
        padding: 5px 12px;
        border-radius: 999px;
      }

      .step {
        color: var(--text-muted);
        width: 28px;
        height: 28px;
        flex: 0 0 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .step::after {
        inset: -18px;
      }

      .weekdays,
      .grid {
        display: grid;
        grid-template-columns: var(--gutter, 24px) repeat(7, minmax(0, 1fr));
      }

      .weekdays {
        gap: 4px;
      }

      .weekdays div {
        text-align: center;
        font-size: 11px;
        letter-spacing: 0.04em;
        color: var(--text-muted);
        font-weight: 600;
      }

      .grid {
        flex: 1;
        min-height: 0;
        grid-template-rows: repeat(6, minmax(0, 1fr));
        gap: 2px 4px;
      }

      .cell {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        color: var(--text);
      }

      .week-no {
        font-size: 11px;
        color: var(--text-muted);
      }

      .outside {
        color: var(--text-muted);
        opacity: 0.5;
      }

      .today-mark {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: var(--accent-amber);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        font-weight: 600;
        color: var(--on-amber);
      }

      footer {
        font-size: 12px;
        color: var(--text-muted);
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    // The "today" highlight and the footer both go stale at midnight.
    this.refreshTimer = window.setInterval(() => {
      this.today = new Date();
      this.fetchedFor = undefined;
      void this.fetchNextEvent();
    }, REFRESH_MS);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  protected willUpdate(changed: PropertyValues) {
    if (changed.has("hass") || changed.has("nextEventFrom")) {
      void this.fetchNextEvent();
    }
  }

  private async fetchNextEvent() {
    const entityId = this.nextEventFrom;
    if (!this.hass || !entityId || this.fetchedFor === entityId) return;
    this.fetchedFor = entityId;

    const start = new Date();
    const end = new Date(start.getTime() + LOOKAHEAD_DAYS * 86400000);
    const path =
      `calendars/${entityId}` +
      `?start=${encodeURIComponent(start.toISOString())}` +
      `&end=${encodeURIComponent(end.toISOString())}`;

    try {
      const events = await this.hass.callApi<CalendarEvent[]>("GET", path);
      const next = events
        .map((ev) => ({
          summary: ev.summary,
          date: new Date(ev.start.dateTime ?? ev.start.date ?? ""),
        }))
        .filter((ev) => !Number.isNaN(ev.date.getTime()))
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
      this.nextEvent = next;
    } catch {
      // A missing or unauthorised calendar just hides the footer line.
      this.nextEvent = undefined;
    }
  }

  private step(months: number) {
    const d = new Date(this.cursor);
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    this.cursor = d;
  }

  private goToday = () => {
    this.today = new Date();
    this.cursor = new Date();
  };

  render() {
    const days = monthGrid(this.cursor.getFullYear(), this.cursor.getMonth());
    const gutter = this.showWeekNumbers ? "24px" : "0px";

    return html`
      <div class="panel" ?data-bare=${this.bare} style=${`--gutter: ${gutter}`}>
        <header>
          <div class="month">${monthTitle(this.cursor)}</div>
          <button class="today-btn" aria-label="Tänään" @click=${this.goToday}>Tänään</button>
          <button class="step" aria-label="Edellinen kuukausi" @click=${() => this.step(-1)}>
            ${icon("chevronLeft", 16, 2)}
          </button>
          <button class="step" aria-label="Seuraava kuukausi" @click=${() => this.step(1)}>
            ${icon("chevronRight", 16, 2)}
          </button>
        </header>

        <div class="weekdays">
          <div></div>
          ${WEEKDAYS.map((d) => html`<div>${d}</div>`)}
        </div>

        <div class="grid">
          ${days.map((day, i) => {
            // Week number sits in the gutter at the start of each row.
            const gutterCell =
              i % 7 === 0 && this.showWeekNumbers
                ? html`<div class="cell week-no">${isoWeek(day)}</div>`
                : i % 7 === 0
                  ? html`<div></div>`
                  : nothing;

            const outside = day.getMonth() !== this.cursor.getMonth();
            const isToday = sameDay(day, this.today);

            return html`
              ${gutterCell}
              <div class="cell ${outside ? "outside" : ""}">
                ${isToday
                  ? html`<div class="today-mark">${day.getDate()}</div>`
                  : day.getDate()}
              </div>
            `;
          })}
        </div>

        ${this.nextEvent
          ? html`
              <footer>
                Seuraava juhlapyhä: ${this.nextEvent.summary}, ${shortDate(this.nextEvent.date)}
              </footer>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-calendar-panel": KtCalendarPanel;
  }
}

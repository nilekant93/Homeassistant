import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { base, switchStyles } from "../theme";
import { icon } from "../icons";
import { isOn } from "../format";
import type { HomeAssistant, SettingsConfig, Theme, ThemeMode } from "../types";

@customElement("kt-page-settings")
export class KtPageSettings extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) config: SettingsConfig = {};
  @property() mode: ThemeMode = "light";
  @property() scheduleSummary = "";
  @property({ attribute: false }) viewport = { width: 0, height: 0 };
  @property({ type: Number }) scale = 1;

  static styles = [
    base,
    switchStyles,
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
        gap: 28px;
      }

      h1 {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 26px;
        color: var(--text);
        margin: 0;
      }

      .subtitle {
        font-size: 14px;
        color: var(--text-muted);
        margin-top: 4px;
      }

      .card {
        width: 620px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        box-shadow: var(--shadow);
        display: flex;
        flex-direction: column;
      }

      .row {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px 22px;
        text-align: left;
        width: 100%;
      }

      .row + .row {
        border-top: 1px solid var(--border);
      }

      .row-text {
        flex: 1;
        min-width: 0;
      }

      .row-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--text);
      }

      .row-desc {
        font-size: 13px;
        color: var(--text-muted);
        margin-top: 3px;
      }

      .segmented {
        display: flex;
        gap: 4px;
        background: var(--surface-2);
        border-radius: 999px;
        padding: 4px;
        flex: 0 0 auto;
      }

      .segment {
        position: relative;
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 10px 18px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-muted);
        transition: background 160ms ease, color 160ms ease;
      }

      /* Tap area reaching 48dp once the canvas is scaled to 75%, without
         making the pill itself look chunky. */
      .segment::after {
        content: "";
        position: absolute;
        inset: -12px -4px;
      }

      .segment[data-active] {
        background: var(--surface);
        color: var(--text);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
      }

      .diagnostics {
        font-size: 12px;
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
      }
    `,
  ];

  private setTheme(theme: Theme) {
    this.dispatchEvent(
      new CustomEvent("theme-change", { detail: theme, bubbles: true, composed: true })
    );
  }

  private toggleKiosk = () => {
    const entityId = this.config.kiosk_toggle;
    if (!entityId) return;
    this.hass.callService("input_boolean", "toggle", {}, { entity_id: entityId });
  };

  private reload = () => {
    window.location.reload();
  };

  private renderThemeRow() {
    // Neither segment is active while the schedule is in charge, so the two
    // rows can never both look like they are deciding the theme.
    const segment = (value: Theme, label: string, iconName: string) => html`
      <button
        class="segment"
        ?data-active=${this.mode === value}
        aria-pressed=${this.mode === value ? "true" : "false"}
        @click=${() => this.setTheme(value)}
      >
        ${icon(iconName, 16, 1.8)} ${label}
      </button>
    `;

    return html`
      <div class="row">
        <div class="row-text">
          <div class="row-title">Teema</div>
          <div class="row-desc">
            ${this.mode === "schedule"
              ? "Ajastus päättää — valitse tästä ohittaaksesi sen"
              : "Vaalea päiväkäyttöön, tumma illaksi"}
          </div>
        </div>
        <div class="segmented">
          ${segment("light", "Vaalea", "sun")} ${segment("dark", "Tumma", "moon")}
        </div>
      </div>
    `;
  }

  private renderScheduleRow() {
    const on = this.mode === "schedule";

    return html`
      <button
        class="row"
        aria-pressed=${on ? "true" : "false"}
        @click=${() =>
          this.dispatchEvent(
            new CustomEvent("schedule-toggle", { bubbles: true, composed: true })
          )}
      >
        <div class="row-text">
          <div class="row-title">Ajastus</div>
          <div class="row-desc">${this.scheduleSummary || "Vaihtaa teeman automaattisesti"}</div>
        </div>
        <div class="track" ?data-on=${on} style=${`background: ${on ? "var(--accent-teal)" : "var(--border)"}`}>
          <div class="knob"></div>
        </div>
      </button>
    `;
  }

  private renderKioskRow() {
    const entityId = this.config.kiosk_toggle;
    if (!entityId) return nothing;

    const on = isOn(this.hass?.states[entityId]);

    return html`
      <button class="row" aria-pressed=${on ? "true" : "false"} @click=${this.toggleKiosk}>
        <div class="row-text">
          <div class="row-title">Kioskitila</div>
          <div class="row-desc">Piilottaa Home Assistantin otsikkopalkin ja sivuvalikon</div>
        </div>
        <div class="track" ?data-on=${on} style=${`background: ${on ? "var(--accent-teal)" : "var(--border)"}`}>
          <div class="knob"></div>
        </div>
      </button>
    `;
  }

  render() {
    return html`
      <div class="page">
        <div>
          <h1>Asetukset</h1>
          <div class="subtitle">Ulkoasu ja ylläpito</div>
        </div>

        <div class="card">
          ${this.renderThemeRow()} ${this.renderScheduleRow()} ${this.renderKioskRow()}
          ${this.config.show_reload === false
            ? nothing
            : html`
                <button class="row" @click=${this.reload}>
                  <div class="row-text">
                    <div class="row-title">Käynnistä näkymä uudelleen</div>
                    <div class="row-desc">Jos käyttöliittymä jumittaa tai päivitys ei näy</div>
                  </div>
                  ${icon("reload", 20, 1.8)}
                </button>
              `}
        </div>

        <div class="diagnostics">
          Näyttö ${this.viewport.width} × ${this.viewport.height} CSS-pikseliä ·
          skaalaus ${Math.round(this.scale * 100)} % ·
          pikselitiheys ${window.devicePixelRatio}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-page-settings": KtPageSettings;
  }
}

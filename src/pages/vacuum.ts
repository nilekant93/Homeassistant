import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { base } from "../theme";
import { icon } from "../icons";
import type { HassEntity, HomeAssistant, VacuumConfig } from "../types";

import "../components/vacuum-map";

/** The integration reports English status strings; these are the ones seen. */
const STATUS_FI: Record<string, string> = {
  Charging: "Latautuu",
  "Charging completed": "Ladattu täyteen",
  Cleaning: "Siivoaa",
  "Segment cleaning": "Siivoaa huoneita",
  "Zone cleaning": "Siivoaa aluetta",
  "Spot cleaning": "Siivoaa kohtaa",
  Paused: "Tauolla",
  Idle: "Valmiina",
  Sleeping: "Lepotilassa",
  Standby: "Valmiustilassa",
  "Back to charge": "Palaa telakkaan",
  Returning: "Palaa telakkaan",
  Error: "Virhe",
  Removed: "Irrotettu",
};

const FAN_SPEED_FI: Record<string, string> = {
  Silent: "Hiljainen",
  Quiet: "Hiljainen",
  Standard: "Normaali",
  Strong: "Tehokas",
  Turbo: "Turbo",
};

@customElement("kt-page-vacuum")
export class KtPageVacuum extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) config: VacuumConfig = {};

  @state() private selected: number[] = [];

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

      h1 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 30px;
        font-weight: 600;
        color: var(--text);
      }

      .subtitle {
        font-size: 15px;
        color: var(--text-muted);
        margin-top: 4px;
      }

      .body {
        flex: 1;
        min-height: 0;
        display: flex;
        gap: 28px;
      }

      .map-card {
        flex: 1;
        min-width: 0;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        box-shadow: var(--shadow);
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      kt-vacuum-map {
        flex: 1;
        min-height: 0;
      }

      .selection {
        display: flex;
        align-items: center;
        gap: 14px;
        border-top: 1px solid var(--border);
        padding-top: 14px;
      }

      .selection-text {
        flex: 1;
        min-width: 0;
        font-size: 14px;
        color: var(--text-muted);
      }

      .side {
        flex: 0 0 372px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        overflow-y: auto;
      }

      .card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        box-shadow: var(--shadow);
        padding: 20px 22px;
      }

      .status-top {
        display: flex;
        align-items: baseline;
        gap: 12px;
      }

      .state {
        flex: 1;
        min-width: 0;
        font-family: var(--font-display);
        font-size: 22px;
        font-weight: 600;
        color: var(--text);
      }

      .battery {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
      }

      .status-detail {
        font-size: 14px;
        color: var(--text-muted);
        margin-top: 6px;
      }

      .actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .action {
        height: 84px;
        border-radius: 16px;
        background: var(--surface-2);
        color: var(--text);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        transition: background 160ms ease, color 160ms ease;
      }

      .action[data-primary] {
        background: var(--accent-amber);
        color: var(--on-amber);
      }

      .action:active {
        transform: scale(0.97);
      }

      .label {
        font-size: 13px;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: var(--text-muted);
        font-weight: 600;
        margin-bottom: 12px;
      }

      .segmented {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .segment {
        height: 52px;
        border-radius: 12px;
        background: var(--surface-2);
        color: var(--text-muted);
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 160ms ease, color 160ms ease;
      }

      .segment[data-active] {
        background: var(--accent-teal-soft);
        color: var(--accent-teal);
      }

      .consumable {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .consumable + .consumable {
        margin-top: 14px;
      }

      .consumable svg {
        flex: 0 0 22px;
        color: var(--text-muted);
      }

      .consumable-body {
        flex: 1;
        min-width: 0;
      }

      .consumable-top {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        color: var(--text);
        margin-bottom: 6px;
      }

      .consumable-pct {
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
      }

      .bar {
        height: 6px;
        border-radius: 3px;
        background: var(--surface-2);
        overflow: hidden;
      }

      .bar div {
        height: 100%;
        border-radius: 3px;
      }

      .clean-btn {
        height: 56px;
        padding: 0 24px;
        border-radius: 999px;
        background: var(--accent-amber);
        color: var(--on-amber);
        font-size: 15px;
        font-weight: 600;
      }

      .clear-btn {
        height: 56px;
        padding: 0 20px;
        border-radius: 999px;
        background: var(--surface-2);
        color: var(--text-muted);
        font-size: 15px;
        font-weight: 600;
      }
    `,
  ];

  private get vacuum(): HassEntity | undefined {
    return this.hass?.states[this.config.entity ?? ""];
  }

  private call(service: string, data: Record<string, unknown> = {}) {
    this.hass.callService("vacuum", service, data, { entity_id: this.config.entity });
  }

  private onRoomToggle = (event: CustomEvent<number>) => {
    const id = event.detail;
    this.selected = this.selected.includes(id)
      ? this.selected.filter((x) => x !== id)
      : [...this.selected, id];
  };

  private cleanSelected = () => {
    if (!this.selected.length) return;
    // The segment service belongs to the integration, not the vacuum domain.
    this.hass.callService(
      "dreame_vacuum",
      "vacuum_clean_segment",
      { segments: this.selected },
      { entity_id: this.config.entity }
    );
    this.selected = [];
  };

  private renderStatus(e: HassEntity | undefined) {
    const attrs = e?.attributes ?? {};
    const status = String(attrs.status ?? e?.state ?? "");
    const battery = attrs.battery_level as number | undefined;
    const running = attrs.running === true || attrs.paused === true;

    const detail = running
      ? `Siivottu ${attrs.cleaned_area ?? 0} m² · ${attrs.cleaning_time ?? 0} min`
      : `Yhteensä ${attrs.total_cleaned_area ?? 0} m² · ${attrs.cleaning_count ?? 0} siivousta`;

    const error = attrs.error && attrs.error !== "No error" ? String(attrs.error) : undefined;

    return html`
      <div class="card">
        <div class="status-top">
          <div class="state">${STATUS_FI[status] ?? status}</div>
          ${battery !== undefined ? html`<div class="battery">${battery} %</div>` : nothing}
        </div>
        <div class="status-detail">${error ?? detail}</div>
      </div>
    `;
  }

  private renderActions(e: HassEntity | undefined) {
    const attrs = e?.attributes ?? {};
    const running = attrs.running === true;

    const action = (
      label: string,
      iconName: string,
      onClick: () => void,
      primary = false
    ) => html`
      <button class="action" ?data-primary=${primary} @click=${onClick}>
        ${icon(iconName, 26)} ${label}
      </button>
    `;

    return html`
      <div class="card actions">
        ${running
          ? action("Tauko", "pause", () => this.call("pause"))
          : action("Aloita", "play", () => this.call("start"), true)}
        ${action("Kotiin", "dock", () => this.call("return_to_base"))}
        ${action("Paikanna", "locate", () => this.call("locate"))}
      </div>
    `;
  }

  private renderSuction(e: HassEntity | undefined) {
    if (this.config.show_suction === false) return nothing;

    const attrs = e?.attributes ?? {};
    // fan_speed is the standard surface; suction_level is the integration's
    // own copy and uses different wording for the same steps.
    const list = (attrs.fan_speed_list as string[] | undefined) ?? [];
    const current = attrs.fan_speed as string | undefined;
    if (!list.length) return nothing;

    return html`
      <div class="card">
        <div class="label">Imuteho</div>
        <div class="segmented">
          ${list.map(
            (speed) => html`
              <button
                class="segment"
                ?data-active=${speed === current}
                @click=${() => this.call("set_fan_speed", { fan_speed: speed })}
              >
                ${FAN_SPEED_FI[speed] ?? speed}
              </button>
            `
          )}
        </div>
      </div>
    `;
  }

  private renderConsumables(e: HassEntity | undefined) {
    if (this.config.show_consumables === false) return nothing;

    const attrs = e?.attributes ?? {};
    const items: Array<[string, string, number | undefined, number | undefined]> = [
      ["Pääharja", "brush", attrs.main_brush_left as number, attrs.main_brush_time_left as number],
      ["Sivuharja", "brush", attrs.side_brush_left as number, attrs.side_brush_time_left as number],
      ["Suodatin", "filter", attrs.filter_left as number, attrs.filter_time_left as number],
    ];

    return html`
      <div class="card">
        <div class="label">Tarvikkeet</div>
        ${items.map(([label, iconName, pct, hours]) => {
          if (pct === undefined) return nothing;
          // Below a tenth left the bar turns amber; it is the one number on
          // this page that ever needs acting on.
          const color = pct <= 10 ? "var(--accent-amber)" : "var(--accent-teal)";
          return html`
            <div class="consumable">
              ${icon(iconName, 22, 1.6)}
              <div class="consumable-body">
                <div class="consumable-top">
                  <span>${label}</span>
                  <span class="consumable-pct">
                    ${pct} %${hours !== undefined ? ` · ${hours} h` : ""}
                  </span>
                </div>
                <div class="bar"><div style=${`width: ${pct}%; background: ${color}`}></div></div>
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  render() {
    const e = this.vacuum;
    const count = this.selected.length;

    return html`
      <div class="page" @room-toggle=${this.onRoomToggle}>
        <div>
          <h1>Imuri</h1>
          <div class="subtitle">Kartta, huoneet ja imuteho</div>
        </div>

        <div class="body">
          <div class="map-card">
            ${this.config.map_camera
              ? html`
                  <kt-vacuum-map
                    .hass=${this.hass}
                    .cameraEntity=${this.config.map_camera}
                    .selected=${this.selected}
                    .hiddenRooms=${this.config.hidden_rooms ?? []}
                  ></kt-vacuum-map>
                `
              : nothing}

            <div class="selection">
              <div class="selection-text">
                ${count
                  ? `${count} ${count === 1 ? "huone" : "huonetta"} valittuna`
                  : "Valitse huoneita kartalta"}
              </div>
              ${count
                ? html`
                    <button class="clear-btn" @click=${() => (this.selected = [])}>Tyhjennä</button>
                    <button class="clean-btn" @click=${this.cleanSelected}>Siivoa valitut</button>
                  `
                : nothing}
            </div>
          </div>

          <div class="side">
            ${this.renderStatus(e)} ${this.renderActions(e)} ${this.renderSuction(e)}
            ${this.renderConsumables(e)}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-page-vacuum": KtPageVacuum;
  }
}

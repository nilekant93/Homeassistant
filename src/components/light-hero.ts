import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { base, switchStyles } from "../theme";
import { icon } from "../icons";
import { brightnessPct, colorName, isOn, lightColor } from "../format";
import { QUICK_SWATCHES, matchSwatch, type Swatch } from "../palette";
import type { HassEntity, HomeAssistant, LightConfig } from "../types";

import "./brightness-slider";
import "./color-row";
import "./color-dialog";

/**
 * A Hue bridge starts dropping commands past roughly ten per second, and a
 * drag produces far more than that — so brightness is sent at most this often
 * while moving, plus once more when the finger lifts.
 */
const SEND_INTERVAL_MS = 140;

const COLOR_CAPABLE = ["hs", "rgb", "rgbw", "rgbww", "xy", "color_temp"];

@customElement("kt-light-hero")
export class KtLightHero extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) config!: LightConfig;

  @state() private dialogOpen = false;

  private lastSent = 0;
  private trailing?: number;

  static styles = [
    base,
    switchStyles,
    css`
      :host {
        display: block;
      }

      .card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 24px;
        padding: 26px 30px 30px;
        box-shadow: var(--shadow);
      }

      .head {
        display: flex;
        align-items: center;
        gap: 18px;
      }

      .icon-wrap {
        width: 64px;
        height: 64px;
        flex: 0 0 64px;
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 180ms ease, color 180ms ease;
      }

      .identity {
        flex: 1;
        min-width: 0;
      }

      .name {
        font-family: var(--font-display);
        font-size: 26px;
        font-weight: 600;
        color: var(--text);
      }

      .state {
        font-size: 15px;
        color: var(--text-muted);
        margin-top: 4px;
      }

      .toggle {
        flex: 0 0 auto;
        width: 64px;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }

      .section-head {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-top: 14px;
      }

      .label {
        flex: 1;
        min-width: 0;
        font-size: 14px;
        color: var(--text-muted);
      }

      .palette-btn {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 12px 20px;
        border-radius: 999px;
        background: var(--surface-2);
        color: var(--text);
        font-size: 14px;
        font-weight: 600;
      }

      .disabled {
        opacity: 0.45;
        pointer-events: none;
      }
    `,
  ];

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.trailing) clearTimeout(this.trailing);
    // Leaving the page with the dialog open must not strand the idle timer.
    if (this.dialogOpen) this.announceModal(false);
  }

  protected updated(changed: PropertyValues) {
    if (changed.has("dialogOpen")) this.announceModal(this.dialogOpen);
  }

  /** Lets the shell suspend the idle return while the palette is being read. */
  private announceModal(open: boolean) {
    this.dispatchEvent(
      new CustomEvent("modal-state", { detail: { open }, bubbles: true, composed: true })
    );
  }

  private get entity(): HassEntity | undefined {
    return this.hass?.states[this.config.entity];
  }

  private get supportsColor(): boolean {
    const modes = this.entity?.attributes.supported_color_modes;
    return Array.isArray(modes) && modes.some((m) => COLOR_CAPABLE.includes(String(m)));
  }

  private toggle = () => {
    this.hass.callService("light", "toggle", {}, { entity_id: this.config.entity });
  };

  private applyBrightness(value: number) {
    if (value <= 0) {
      this.hass.callService("light", "turn_off", {}, { entity_id: this.config.entity });
      return;
    }
    this.hass.callService(
      "light",
      "turn_on",
      { brightness_pct: value },
      { entity_id: this.config.entity }
    );
  }

  private onBrightnessChange = (event: CustomEvent<{ value: number; final: boolean }>) => {
    const { value, final } = event.detail;

    if (this.trailing) {
      clearTimeout(this.trailing);
      this.trailing = undefined;
    }

    if (final) {
      this.lastSent = Date.now();
      this.applyBrightness(value);
      return;
    }

    const since = Date.now() - this.lastSent;
    if (since >= SEND_INTERVAL_MS) {
      this.lastSent = Date.now();
      this.applyBrightness(value);
    } else {
      // Keep the most recent value rather than dropping it: without this the
      // lamp can settle on a stale brightness when a drag stops abruptly.
      this.trailing = window.setTimeout(() => {
        this.lastSent = Date.now();
        this.applyBrightness(value);
      }, SEND_INTERVAL_MS - since);
    }
  };

  private onSwatchSelect = (event: CustomEvent<Swatch>) => {
    const swatch = event.detail;
    const data =
      swatch.kind === "white"
        ? { color_temp_kelvin: swatch.kelvin }
        : { rgb_color: swatch.rgb };

    this.hass.callService("light", "turn_on", data, { entity_id: this.config.entity });
    this.dialogOpen = false;
  };

  private stateLabel(e: HassEntity | undefined, selectedLabel?: string): string {
    if (!e) return "Ei saatavilla";
    if (!isOn(e)) return "Pois päältä";

    const parts = ["Päällä", `${brightnessPct(e)} %`];
    const name = selectedLabel ?? colorName(e);
    if (name) parts.push(name);
    return parts.join(" · ");
  }

  render() {
    const e = this.entity;
    const on = isOn(e);
    const accent = lightColor(e);
    const pct = on ? brightnessPct(e) : 0;

    const selectedId = matchSwatch(e, QUICK_SWATCHES);
    const selected = QUICK_SWATCHES.find((s) => s.id === selectedId);

    return html`
      <div class="card">
        <div class="head">
          <div
            class="icon-wrap"
            style=${`background: ${on ? `${accent}33` : "var(--surface-2)"};
                     color: ${on ? accent : "var(--text-muted)"}`}
          >
            ${icon(this.config.icon ?? "bulb", 30)}
          </div>

          <div class="identity">
            <div class="name">
              ${this.config.name ?? e?.attributes.friendly_name ?? this.config.entity}
            </div>
            <div class="state">${this.stateLabel(e, selected?.label)}</div>
          </div>

          <button
            class="toggle"
            aria-label=${on ? "Sammuta" : "Sytytä"}
            aria-pressed=${on ? "true" : "false"}
            @click=${this.toggle}
          >
            <div class="track" ?data-on=${on} style=${`background: ${on ? accent : "var(--border)"}`}>
              <div class="knob"></div>
            </div>
          </button>
        </div>

        <div class="section-head">
          <div class="label">Kirkkaus · ${pct} %</div>
        </div>

        <kt-brightness-slider
          .value=${pct}
          .color=${accent}
          @brightness-change=${this.onBrightnessChange}
        ></kt-brightness-slider>

        ${this.supportsColor
          ? html`
              <div class="section-head">
                <div class="label">Väri · ${selected?.label ?? (colorName(e) || "—")}</div>
                <button class="palette-btn" @click=${() => (this.dialogOpen = true)}>
                  ${icon("palette", 18)} Väripaletti
                </button>
              </div>

              <div class=${on ? "" : "disabled"}>
                <kt-color-row
                  .swatches=${QUICK_SWATCHES}
                  .selected=${selectedId}
                  @swatch-select=${this.onSwatchSelect}
                ></kt-color-row>
              </div>
            `
          : nothing}
      </div>

      ${this.dialogOpen
        ? html`
            <kt-color-dialog
              .selected=${matchSwatch(e, QUICK_SWATCHES)}
              @swatch-select=${this.onSwatchSelect}
              @dialog-close=${() => (this.dialogOpen = false)}
            ></kt-color-dialog>
          `
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kt-light-hero": KtLightHero;
  }
}

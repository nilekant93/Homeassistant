import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { base, tokens } from "./theme";
import { isOn } from "./format";
import type { CardConfig, HomeAssistant, NavItem, Theme } from "./types";

import "./components/sidebar";
import "./pages/home";
import "./pages/settings";

/** Pages with an implementation. Everything else in `nav` renders as inert. */
const IMPLEMENTED = ["koti", "asetukset"];

const THEME_STORAGE_KEY = "kotitabletti.theme";

const DEFAULT_NAV: NavItem[] = [
  { page: "koti", label: "Koti", icon: "home" },
  { page: "valot", label: "Valot", icon: "bulb" },
  { page: "imuri", label: "Imuri", icon: "vacuum" },
  { page: "kauppa", label: "Kauppalista", icon: "cart" },
  { page: "junat", label: "Junat", icon: "train" },
];

const DEFAULT_SETTINGS_NAV: NavItem = {
  page: "asetukset",
  label: "Asetukset",
  icon: "sliders",
};

@customElement("kotitabletti-app")
export class KotitablettiApp extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  @state() private config!: CardConfig;
  @state() private page = "koti";
  /** Used only when no `theme_entity` is configured. */
  @state() private localTheme: Theme = "light";

  /** Live viewport measurement, surfaced on the settings page for diagnosis. */
  @state() private viewport = { width: 0, height: 0 };

  private idleTimer?: number;
  private onResize = () => this.measureViewport();

  static styles = [
    tokens,
    base,
    css`
      :host {
        display: block;
      }

      /* The viewport is whatever the device gives us; the canvas inside it is
         always exactly the size the design was drawn for, scaled to fit. */
      .viewport {
        position: relative;
        width: 100%;
        height: 100vh;
        overflow: hidden;
        background: var(--bg);
      }

      /* Centred by absolute positioning rather than flex: the canvas is
         usually WIDER than the viewport before scaling, and an oversized flex
         item centres inconsistently across engines. Translating by half its
         own size and scaling about the centre is unambiguous everywhere. */
      .shell {
        position: absolute;
        top: 50%;
        left: 50%;
        transform-origin: center center;
        display: flex;
        background: var(--bg);
        color: var(--text);
        font-family: var(--font-body);
        overflow: hidden;
      }

      main {
        flex: 1;
        min-width: 0;
        height: 100%;
      }

      .placeholder {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: var(--text-muted);
      }

      .placeholder .title {
        font-family: var(--font-display);
        font-size: 22px;
        font-weight: 600;
        color: var(--text);
      }
    `,
  ];

  /** Called by Home Assistant with the card's YAML block. */
  setConfig(config: CardConfig) {
    if (!config) throw new Error("Konfiguraatio puuttuu");

    this.config = config;
    this.page = config.start_page ?? "koti";

    if (!config.theme_entity) {
      const stored = this.readStoredTheme();
      this.localTheme = stored ?? config.default_theme ?? "light";
    }
  }

  /** Home Assistant sizes the card in ~50px rows; this one fills the view. */
  getCardSize() {
    return 16;
  }

  connectedCallback() {
    super.connectedCallback();
    this.resetIdleTimer();
    this.measureViewport();
    window.addEventListener("resize", this.onResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.idleTimer) clearTimeout(this.idleTimer);
    window.removeEventListener("resize", this.onResize);
  }

  /**
   * Measured from the window rather than this element: the host's own height
   * is derived from its content, so asking it how tall it may be is circular.
   * In kiosk mode the window is exactly the screen, which is the target state.
   */
  private measureViewport() {
    this.viewport = { width: window.innerWidth, height: window.innerHeight };
  }

  private get canvas() {
    return {
      width: this.config?.canvas_width ?? 1280,
      height: this.config?.canvas_height ?? 800,
    };
  }

  /** How much the design canvas must shrink (or grow) to fit the screen. */
  private get scale(): number {
    if (this.config?.fit === false) return 1;
    const { width, height } = this.viewport;
    if (!width || !height) return 1;
    return Math.min(width / this.canvas.width, height / this.canvas.height);
  }

  private readStoredTheme(): Theme | undefined {
    try {
      const value = localStorage.getItem(THEME_STORAGE_KEY);
      return value === "dark" || value === "light" ? value : undefined;
    } catch {
      // Private mode or blocked site data — fall through to the default.
      return undefined;
    }
  }

  private get theme(): Theme {
    const entityId = this.config?.theme_entity;
    if (entityId) {
      const entity = this.hass?.states[entityId];
      // The helper is a plain toggle: on means dark.
      if (entity) return isOn(entity) ? "dark" : "light";
    }
    return this.localTheme;
  }

  private onThemeChange = (event: CustomEvent<Theme>) => {
    const theme = event.detail;
    const entityId = this.config?.theme_entity;

    if (entityId) {
      this.hass.callService(
        "input_boolean",
        theme === "dark" ? "turn_on" : "turn_off",
        {},
        { entity_id: entityId }
      );
      return;
    }

    this.localTheme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Not persisting across reloads is survivable; the session still works.
    }
  };

  private onNavigate = (event: CustomEvent<string>) => {
    this.page = event.detail;
    this.resetIdleTimer();
  };

  /**
   * The palette is declared once, on this host. Custom properties inherit
   * through shadow boundaries, so every child picks it up without redefining
   * — and without each one having to be told which theme is active.
   */
  protected updated() {
    this.setAttribute("data-theme", this.theme);
  }

  /** Returns the tablet to the start page after a spell of no interaction. */
  private resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);

    const minutes = this.config?.idle_return_minutes ?? 0;
    if (!minutes) return;

    this.idleTimer = window.setTimeout(() => {
      this.page = this.config.start_page ?? "koti";
    }, minutes * 60_000);
  }

  private renderPage() {
    switch (this.page) {
      case "koti":
        return html`
          <kt-page-home .hass=${this.hass} .config=${this.config.home ?? {}}></kt-page-home>
        `;
      case "asetukset":
        return html`
          <kt-page-settings
            .hass=${this.hass}
            .config=${this.config.settings ?? {}}
            .theme=${this.theme}
            .viewport=${this.viewport}
            .scale=${this.scale}
          ></kt-page-settings>
        `;
      default: {
        const item = this.config.nav?.find((n) => n.page === this.page);
        return html`
          <div class="placeholder">
            <div class="title">${item?.label ?? this.page}</div>
            <div>Tätä sivua ei ole vielä toteutettu.</div>
          </div>
        `;
      }
    }
  }

  render() {
    if (!this.config) return html``;

    const { width, height } = this.canvas;
    const fit = `width: ${width}px; height: ${height}px;
                 transform: translate(-50%, -50%) scale(${this.scale});`;

    return html`
      <div
        class="viewport"
        @navigate=${this.onNavigate}
        @theme-change=${this.onThemeChange}
        @pointerdown=${() => this.resetIdleTimer()}
      >
        <div class="shell" style=${fit}>
          <kt-sidebar
            .items=${this.config.nav ?? DEFAULT_NAV}
            .settingsItem=${this.config.settings_nav ?? DEFAULT_SETTINGS_NAV}
            .activePage=${this.page}
            .availablePages=${IMPLEMENTED}
          ></kt-sidebar>

          <main>${this.renderPage()}</main>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kotitabletti-app": KotitablettiApp;
  }
}

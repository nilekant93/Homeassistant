/** Minimal shape of the objects Home Assistant hands a custom card. */

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  language: string;
  callService(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: Record<string, unknown>
  ): Promise<unknown>;
  callApi<T>(method: "GET" | "POST", path: string): Promise<T>;
  connection: {
    subscribeMessage<T>(
      callback: (message: T) => void,
      subscribeMessage: Record<string, unknown>
    ): Promise<() => Promise<void>>;
  };
}

/** One entry in the left rail. */
export interface NavItem {
  page: string;
  label: string;
  icon: string;
}

export type LightStyle = "dimmer" | "switch";

export interface LightConfig {
  entity: string;
  name?: string;
  style?: LightStyle;
  /** Icon key from `icons.ts`; defaults to a plain bulb. */
  icon?: string;
}

export interface HomeConfig {
  clock?: { show_weekday?: boolean };
  weather?: { entity: string; forecast_days?: number; forecast_hours?: number };
  calendar?: {
    entities?: string[];
    show_week_numbers?: boolean;
    next_event_from?: string;
  };
  lights?: LightConfig[];
}

export interface LightsConfig {
  /** The one light that gets the hero card with brightness and colour. */
  primary?: LightConfig;
  /** Everything else, rendered as plain switch tiles. */
  others?: LightConfig[];
}

export interface SettingsConfig {
  kiosk_toggle?: string;
  show_reload?: boolean;
}

export interface CardConfig {
  type: string;
  start_page?: string;
  /** Seconds of no touch before returning to the start page. 0 disables it. */
  idle_return_seconds?: number;
  /** Pages the idle return never applies to; defaults to the settings page. */
  idle_exempt_pages?: string[];
  /**
   * An optional `input_select` holding light / dark / schedule, for sharing
   * the choice with automations. Without one it lives in localStorage.
   */
  theme_mode_entity?: string;
  default_theme_mode?: ThemeMode;
  theme_schedule?: ThemeScheduleConfig;
  nav?: NavItem[];
  settings_nav?: NavItem;
  home?: HomeConfig;
  lights?: LightsConfig;
  settings?: SettingsConfig;
  /** Size the design was drawn for; the canvas scales to fit the real screen. */
  canvas_width?: number;
  canvas_height?: number;
  /** Set false to render the canvas at 1:1 and let it overflow. */
  fit?: boolean;
}

export type Theme = "light" | "dark";

/**
 * "light" and "dark" are the user's own choice; "schedule" hands the decision
 * to the clock. Picking a theme by hand always drops out of "schedule", so
 * the two settings rows can never both claim to be in charge.
 */
export type ThemeMode = Theme | "schedule";

export interface ThemeScheduleConfig {
  /** "sun" follows sun.sun; "times" uses light_at / dark_at. */
  source?: "sun" | "times";
  sun_entity?: string;
  light_at?: string;
  dark_at?: string;
  /** Forces dark inside this window whatever the sun is doing. */
  force_dark_from?: string;
  force_dark_to?: string;
}

/** A single day from `weather/subscribe_forecast`. */
export interface ForecastDay {
  datetime: string;
  condition?: string;
  temperature?: number;
  templow?: number;
}

/** A calendar event as returned by `GET /api/calendars/<entity_id>`. */
export interface CalendarEvent {
  summary: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
}

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
  weather?: { entity: string; forecast_days?: number };
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
  idle_return_minutes?: number;
  /** Where the chosen theme is stored. Without an entity it lives in localStorage. */
  theme_entity?: string;
  default_theme?: Theme;
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

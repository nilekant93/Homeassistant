import type { HassEntity } from "./types";

const FI = "fi-FI";

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "Lauantai 19. syyskuuta" */
export function longDate(d: Date): string {
  return capitalize(
    new Intl.DateTimeFormat(FI, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(d)
  );
}

/** "Syyskuu 2026" */
export function monthTitle(d: Date): string {
  return capitalize(
    new Intl.DateTimeFormat(FI, { month: "long", year: "numeric" }).format(d)
  );
}

/** "la 31.10." */
export function shortDate(d: Date): string {
  const weekday = new Intl.DateTimeFormat(FI, { weekday: "short" }).format(d);
  return `${weekday} ${d.getDate()}.${d.getMonth() + 1}.`;
}

/** "ma", "ti", … for the forecast strip. */
export function weekdayShort(d: Date): string {
  return capitalize(new Intl.DateTimeFormat(FI, { weekday: "short" }).format(d)).replace(".", "");
}

/**
 * Built by hand rather than with Intl: the fi-FI locale separates hours and
 * minutes with a period ("20.32"), and the design calls for a colon.
 */
/** "09", "22" — the hour labels on the weather card's hourly row. */
export function hourShort(d: Date): string {
  return String(d.getHours()).padStart(2, "0");
}

export function clockTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * ISO-8601 week number. Computed locally rather than read from
 * `calendar.viikkonumerot` — the arithmetic is exact and needs no round trip.
 */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Thursday of the current week decides which year the week belongs to.
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * The six-week grid a month view needs, starting on the Monday on or before
 * the 1st. Always 42 days, so the grid never reflows between months.
 */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-based
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

const CONDITIONS: Record<string, string> = {
  "clear-night": "Selkeää",
  cloudy: "Pilvistä",
  exceptional: "Poikkeuksellista",
  fog: "Sumua",
  hail: "Raekuuroja",
  lightning: "Ukkosta",
  "lightning-rainy": "Ukkoskuuroja",
  partlycloudy: "Puolipilvistä",
  pouring: "Rankkasadetta",
  rainy: "Sadetta",
  snowy: "Lumisadetta",
  "snowy-rainy": "Räntäsadetta",
  sunny: "Aurinkoista",
  windy: "Tuulista",
  "windy-variant": "Tuulista",
};

export const conditionLabel = (state: string | undefined) =>
  CONDITIONS[state ?? ""] ?? "—";

export const roundTemp = (t: number | undefined) =>
  t === undefined || t === null ? "–" : `${Math.round(t)}°`;

/* ── Lights ─────────────────────────────────────────────────────────────── */

export const isOn = (e: HassEntity | undefined) => e?.state === "on";

/** Home Assistant stores brightness as 0–255. */
export function brightnessPct(e: HassEntity | undefined): number {
  const raw = e?.attributes.brightness;
  if (typeof raw !== "number") return 0;
  return Math.max(1, Math.round((raw / 255) * 100));
}

const FALLBACK_LIGHT = "#E7A85B";

/**
 * Home Assistant fills in `rgb_color` for colour-temperature lights too, so
 * one attribute covers every colour mode we care about.
 */
export function lightColor(e: HassEntity | undefined): string {
  const rgb = e?.attributes.rgb_color;
  if (Array.isArray(rgb) && rgb.length === 3) {
    const [r, g, b] = rgb as number[];
    return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
  }
  return FALLBACK_LIGHT;
}

const HUES: [number, string][] = [
  [15, "Punainen"],
  [45, "Oranssi"],
  [70, "Keltainen"],
  [160, "Vihreä"],
  [200, "Turkoosi"],
  [250, "Sininen"],
  [290, "Violetti"],
  [330, "Pinkki"],
  [360, "Punainen"],
];

/** A short Finnish name for the light's current colour, e.g. "Lämmin valkoinen". */
export function colorName(e: HassEntity | undefined): string {
  if (!e) return "";

  // Kept to one word: the tile's state line has roughly 180px to work with,
  // and "Lämmin valkoinen" pushes it past the ellipsis.
  const kelvin = e.attributes.color_temp_kelvin;
  const mode = e.attributes.color_mode;
  if (mode === "color_temp" && typeof kelvin === "number") {
    if (kelvin < 2400) return "Kynttilä";
    if (kelvin < 3100) return "Lämmin";
    if (kelvin < 4500) return "Neutraali";
    if (kelvin < 5600) return "Päivänvalo";
    return "Kylmä";
  }

  const rgb = e.attributes.rgb_color;
  if (!Array.isArray(rgb) || rgb.length !== 3) return "";

  const [r, g, b] = (rgb as number[]).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta < 0.08) return "Valkoinen";

  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;

  return HUES.find(([limit]) => hue < limit)![1];
}

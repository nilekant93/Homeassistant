import type { HomeAssistant, Theme, ThemeScheduleConfig } from "./types";

/** "21:30" → 1290 minutes past midnight. */
function parseHm(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return undefined;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return hours * 60 + minutes;
}

const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** Window membership that survives wrapping past midnight (23:00 → 06:00). */
function inWindow(now: number, from: number, to: number): boolean {
  return from <= to ? now >= from && now < to : now >= from || now < to;
}

const hhmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;

function sunIsUp(hass: HomeAssistant, entityId: string): boolean | undefined {
  const state = hass?.states[entityId]?.state;
  if (state === "above_horizon") return true;
  if (state === "below_horizon") return false;
  return undefined;
}

/**
 * Which theme the schedule calls for right now.
 *
 * Evaluated on a timer rather than by scheduling a one-shot timeout at the
 * next transition: re-checking costs nothing and it survives clock changes,
 * daylight saving and the tablet sleeping through a transition.
 */
export function scheduledTheme(
  config: ThemeScheduleConfig | undefined,
  hass: HomeAssistant | undefined,
  now = new Date()
): Theme {
  const cfg = config ?? {};
  const current = minutesOfDay(now);

  // A forced night window overrides the sun. At Oulu's latitude the sun is
  // above the horizon almost around the clock in June, so following it alone
  // would leave the screen glaring white at one in the morning.
  const from = parseHm(cfg.force_dark_from);
  const to = parseHm(cfg.force_dark_to);
  if (from !== undefined && to !== undefined && inWindow(current, from, to)) {
    return "dark";
  }

  if (cfg.source === "times") {
    const lightAt = parseHm(cfg.light_at) ?? 7 * 60;
    const darkAt = parseHm(cfg.dark_at) ?? 21 * 60;
    return inWindow(current, lightAt, darkAt) ? "light" : "dark";
  }

  const up = hass ? sunIsUp(hass, cfg.sun_entity ?? "sun.sun") : undefined;
  // An unavailable sun entity should not strand the tablet in the wrong
  // theme; daytime is the safer guess for a screen someone is looking at.
  return up === false ? "dark" : "light";
}

/** The sub-line under the Ajastus row: what the schedule will actually do. */
export function describeSchedule(
  config: ThemeScheduleConfig | undefined,
  hass: HomeAssistant | undefined
): string {
  const cfg = config ?? {};
  const parts: string[] = [];

  if (cfg.source === "times") {
    parts.push(`Kiinteät ajat · vaalea ${cfg.light_at ?? "07:00"}, tumma ${cfg.dark_at ?? "21:00"}`);
  } else {
    const entityId = cfg.sun_entity ?? "sun.sun";
    const attrs = hass?.states[entityId]?.attributes;
    const next = [attrs?.next_rising, attrs?.next_setting]
      .filter((v): v is string => typeof v === "string")
      .map((v) => new Date(v))
      .filter((d) => !Number.isNaN(d.getTime()) && d.getTime() > Date.now())
      .sort((a, b) => a.getTime() - b.getTime())[0];

    parts.push(next ? `Auringon mukaan · seuraava vaihto ${hhmm(next)}` : "Auringon mukaan");
  }

  if (cfg.force_dark_from && cfg.force_dark_to) {
    parts.push(`tumma aina ${cfg.force_dark_from}–${cfg.force_dark_to}`);
  }

  return parts.join(" · ");
}

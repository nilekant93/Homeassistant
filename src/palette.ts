import type { HassEntity } from "./types";

/**
 * The colours offered on the Valot page: warm-to-cool whites first, then
 * saturated colours. Whites are colour temperatures, colours are RGB — two
 * different service calls, so each swatch carries its own kind.
 */

export type Swatch =
  | { id: string; kind: "white"; kelvin: number; label: string }
  | { id: string; kind: "color"; rgb: [number, number, number]; label: string };

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

/**
 * Tanner Helland's blackbody approximation. Good enough to show the user what
 * a colour temperature will look like; the lamp does the real work.
 */
export function kelvinToRgb(kelvin: number): [number, number, number] {
  const t = kelvin / 100;
  let r: number;
  let g: number;
  let b: number;

  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  }

  if (t >= 66) b = 255;
  else if (t <= 19) b = 0;
  else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;

  return [clamp255(r), clamp255(g), clamp255(b)];
}

/**
 * How far the white swatches are pulled towards pure white.
 *
 * Raw blackbody values are far more saturated than a warm bulb looks to the
 * eye — 2200K comes out a vivid orange, which makes the white swatches
 * indistinguishable from the orange ones sitting next to them in the row.
 */
const WHITE_MIX = 0.42;

export const swatchCss = (s: Swatch) => {
  if (s.kind === "color") {
    const [r, g, b] = s.rgb;
    return `rgb(${r}, ${g}, ${b})`;
  }

  const [r, g, b] = kelvinToRgb(s.kelvin).map((v) =>
    clamp255(v + (255 - v) * WHITE_MIX)
  );
  return `rgb(${r}, ${g}, ${b})`;
};

const white = (kelvin: number, label: string): Swatch => ({
  id: `k${kelvin}`,
  kind: "white",
  kelvin,
  label,
});

const color = (hex: string, label: string): Swatch => ({
  id: hex,
  kind: "color",
  rgb: [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ],
  label,
});

export const WHITES: Swatch[] = [
  white(2200, "Kynttilä"),
  white(2700, "Lämmin"),
  white(3000, "Hehkulamppu"),
  white(3500, "Neutraali"),
  white(4000, "Viileä"),
  white(5000, "Päivänvalo"),
  white(6500, "Kylmä"),
];

/** The full set, shown in the palette dialog. */
export const COLORS: Swatch[] = [
  color("#FFCA28", "Kulta"),
  color("#FFB300", "Meripihka"),
  color("#FB8C00", "Oranssi"),
  color("#F4511E", "Poltettu oranssi"),
  color("#E53935", "Punainen"),
  color("#D81B60", "Karmiini"),
  color("#EC407A", "Pinkki"),
  color("#F48FB1", "Vaaleanpunainen"),
  color("#AB47BC", "Purppura"),
  color("#8E24AA", "Violetti"),
  color("#7E57C2", "Laventeli"),
  color("#5C6BC0", "Indigo"),
  color("#3949AB", "Yösininen"),
  color("#1E88E5", "Sininen"),
  color("#42A5F5", "Taivaansininen"),
  color("#29B6F6", "Vaaleansininen"),
  color("#26C6DA", "Syaani"),
  color("#26A69A", "Turkoosi"),
  color("#2E9E6B", "Smaragdi"),
  color("#66BB6A", "Vihreä"),
  color("#9CCC65", "Ruohonvihreä"),
  color("#D4E157", "Limetti"),
  color("#FFEE58", "Keltainen"),
  color("#FFF59D", "Vaalea keltainen"),
];

/** A shorter run for the inline row — the dialog holds the rest. */
const QUICK_IDS = new Set([
  "#FFCA28",
  "#FB8C00",
  "#E53935",
  "#EC407A",
  "#AB47BC",
  "#7E57C2",
  "#1E88E5",
  "#29B6F6",
  "#26A69A",
  "#66BB6A",
  "#9CCC65",
  "#FFEE58",
]);

export const QUICK_SWATCHES: Swatch[] = [
  ...WHITES,
  ...COLORS.filter((c) => QUICK_IDS.has(c.id)),
];

export const ALL_SWATCHES: Swatch[] = [...WHITES, ...COLORS];

/**
 * Which swatch is currently showing.
 *
 * A Hue bulb maps whatever we send into its own gamut, so the value read back
 * is rarely the value written. Matching therefore finds the nearest swatch
 * within a tolerance rather than looking for equality — without this, no
 * swatch would ever appear selected.
 */
export function matchSwatch(
  entity: HassEntity | undefined,
  swatches: Swatch[]
): string | undefined {
  if (!entity || entity.state !== "on") return undefined;

  const mode = entity.attributes.color_mode;

  if (mode === "color_temp") {
    const kelvin = entity.attributes.color_temp_kelvin;
    if (typeof kelvin !== "number") return undefined;

    let best: { id: string; d: number } | undefined;
    for (const s of swatches) {
      if (s.kind !== "white") continue;
      const d = Math.abs(s.kelvin - kelvin);
      if (!best || d < best.d) best = { id: s.id, d };
    }
    return best && best.d <= 250 ? best.id : undefined;
  }

  const rgb = entity.attributes.rgb_color;
  if (!Array.isArray(rgb) || rgb.length !== 3) return undefined;
  const [r, g, b] = rgb as number[];

  let best: { id: string; d: number } | undefined;
  for (const s of swatches) {
    if (s.kind !== "color") continue;
    const d = Math.hypot(s.rgb[0] - r, s.rgb[1] - g, s.rgb[2] - b);
    if (!best || d < best.d) best = { id: s.id, d };
  }
  return best && best.d <= 70 ? best.id : undefined;
}

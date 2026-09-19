import { svg, type SVGTemplateResult } from "lit";

/**
 * Every icon is drawn in the design's line style: 24×24 box, round caps and
 * joins, `currentColor` stroke. Weight varies by role — 1.8 for navigation and
 * controls, 1.5 for the larger weather glyphs.
 */

const wrap = (
  body: SVGTemplateResult,
  size: number,
  strokeWidth: number,
  stroke: string
) => svg`
  <svg
    width=${size}
    height=${size}
    viewBox="0 0 24 24"
    fill="none"
    stroke=${stroke}
    stroke-width=${strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >${body}</svg>
`;

const paths: Record<string, SVGTemplateResult> = {
  home: svg`
    <path d="M4 11.5 12 4l8 7.5" />
    <path d="M6 10v9.5a.5.5 0 0 0 .5.5H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.5a.5.5 0 0 0 .5-.5V10" />
  `,
  bulb: svg`
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M8.5 10.2c0-2 1.6-4.2 3.5-4.2s3.5 2.2 3.5 4.2c0 1.9-1.3 2.9-1.9 4.3-.2.5-.3 1-.3 1.5H10.7c0-.5-.1-1-.3-1.5-.6-1.4-1.9-2.4-1.9-4.3Z" />
  `,
  vacuum: svg`
    <circle cx="12" cy="12" r="7.5" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <path d="M12 4.5V6" />
  `,
  cart: svg`
    <path d="M4 4h2l1.7 9.9a2 2 0 0 0 2 1.7h6.7a2 2 0 0 0 2-1.6L20 8H7.2" />
    <circle cx="10.2" cy="20" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="16.8" cy="20" r="1.2" fill="currentColor" stroke="none" />
  `,
  train: svg`
    <rect x="6" y="4" width="12" height="13" rx="4.5" />
    <path d="M6.5 9.5h11" />
    <path d="M6 13.5h12" />
    <path d="M8.5 17.5 6.5 21" />
    <path d="M15.5 17.5l2 3.5" />
  `,
  sliders: svg`
    <path d="M4 7h6M14 7h6" />
    <circle cx="12" cy="7" r="2.1" />
    <path d="M4 12h2M10 12h10" />
    <circle cx="7.2" cy="12" r="2.1" />
    <path d="M4 17h9M18 17h2" />
    <circle cx="15.5" cy="17" r="2.1" />
  `,

  // Decorative lights — one glyph per fixture, so the cards stay tellable
  // apart at a glance from across the room.
  cotton: svg`
    <path d="M3.5 7.5c2.7 3.6 5.4 3.6 8 0s5.3-3.6 8 0" />
    <circle cx="6.5" cy="9.3" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="10.6" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="17.5" cy="9.3" r="1.3" fill="currentColor" stroke="none" />
  `,
  curtain: svg`
    <path d="M4 5h16" />
    <path d="M7 5v6" />
    <circle cx="7" cy="12.3" r="1.2" fill="currentColor" stroke="none" />
    <path d="M12 5v9" />
    <circle cx="12" cy="15.3" r="1.2" fill="currentColor" stroke="none" />
    <path d="M17 5v6" />
    <circle cx="17" cy="12.3" r="1.2" fill="currentColor" stroke="none" />
  `,
  star: svg`
    <path d="M12 3.5l2.02 4.32 4.68.5-3.5 3.22.94 4.66L12 13.9l-4.14 2.3.94-4.66-3.5-3.22 4.68-.5L12 3.5Z" />
  `,

  chevronLeft: svg`<path d="M14 6l-6 6 6 6" />`,
  chevronRight: svg`<path d="M10 6l6 6-6 6" />`,
  reload: svg`
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20 4v5h-5" />
  `,
  sun: svg`
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
  `,
  moon: svg`<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />`,
};

/** Home Assistant weather states, drawn in the same line style. */
const weatherPaths: Record<string, SVGTemplateResult> = {
  sunny: svg`
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 3.2v2M12 18.8v2M3.2 12h2M18.8 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
  `,
  clear_night: svg`<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />`,
  partlycloudy: svg`
    <circle cx="9.5" cy="8.5" r="3.2" />
    <path d="M9.5 2.8v1.4M9.5 12.4v1.4M3.8 8.5h1.4M13.8 8.5h1.4M5.7 4.7l1 1M12.3 11.3l1 1M5.7 12.3l1-1M12.3 5.7l1-1" />
    <path d="M7.5 20.2a4.3 4.3 0 0 1 .2-8.6 5.4 5.4 0 0 1 10.3 1.9 3.7 3.7 0 0 1-.9 6.7H7.5Z" fill="var(--surface-2)" />
  `,
  cloudy: svg`
    <path d="M7 19.5a4.5 4.5 0 0 1 .3-9 5.7 5.7 0 0 1 10.9 2 3.9 3.9 0 0 1-1 7H7Z" />
  `,
  rainy: svg`
    <path d="M7 15.5a4.3 4.3 0 0 1 .3-8.6 5.4 5.4 0 0 1 10.3 1.9 3.7 3.7 0 0 1-.9 6.7H7Z" />
    <path d="M9 18.5 8 21M13 18.5 12 21M17 18.5 16 21" />
  `,
  pouring: svg`
    <path d="M7 14.5a4.3 4.3 0 0 1 .3-8.6 5.4 5.4 0 0 1 10.3 1.9 3.7 3.7 0 0 1-.9 6.7H7Z" />
    <path d="M8.5 17 7 21M12.5 17 11 21M16.5 17 15 21" />
  `,
  snowy: svg`
    <path d="M7 14.5a4.3 4.3 0 0 1 .3-8.6 5.4 5.4 0 0 1 10.3 1.9 3.7 3.7 0 0 1-.9 6.7H7Z" />
    <path d="M9 18.5v2.2M7.9 19.2l2.2 1.3M10.1 19.2l-2.2 1.3" />
    <path d="M15 18.5v2.2M13.9 19.2l2.2 1.3M16.1 19.2l-2.2 1.3" />
  `,
  fog: svg`
    <path d="M7 12.5a4.3 4.3 0 0 1 .3-8.6 5.4 5.4 0 0 1 10.3 1.9 3.7 3.7 0 0 1-.9 6.7H7Z" />
    <path d="M4 16.5h16M6 20h12" />
  `,
  lightning: svg`
    <path d="M7 14.5a4.3 4.3 0 0 1 .3-8.6 5.4 5.4 0 0 1 10.3 1.9 3.7 3.7 0 0 1-.9 6.7H7Z" />
    <path d="M13 16.5 10.5 20h3L11 23.5" />
  `,
  windy: svg`
    <path d="M3 9h11a3 3 0 1 0-3-3" />
    <path d="M3 14h15a3 3 0 1 1-3 3" />
  `,
  hail: svg`
    <path d="M7 14.5a4.3 4.3 0 0 1 .3-8.6 5.4 5.4 0 0 1 10.3 1.9 3.7 3.7 0 0 1-.9 6.7H7Z" />
    <circle cx="9" cy="19.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="19.5" r="1.2" fill="currentColor" stroke="none" />
  `,
};

/** Maps a Home Assistant weather state onto one of the glyphs above. */
const weatherAliases: Record<string, string> = {
  "clear-night": "clear_night",
  cloudy: "cloudy",
  exceptional: "sunny",
  fog: "fog",
  hail: "hail",
  lightning: "lightning",
  "lightning-rainy": "lightning",
  partlycloudy: "partlycloudy",
  pouring: "pouring",
  rainy: "rainy",
  snowy: "snowy",
  "snowy-rainy": "snowy",
  sunny: "sunny",
  windy: "windy",
  "windy-variant": "windy",
};

export function icon(name: string, size = 24, strokeWidth = 1.8, stroke = "currentColor") {
  const body = paths[name];
  if (!body) return svg``;
  return wrap(body, size, strokeWidth, stroke);
}

export function weatherIcon(state: string | undefined, size = 46, strokeWidth = 1.5) {
  const key = weatherAliases[state ?? ""] ?? "partlycloudy";
  return wrap(weatherPaths[key], size, strokeWidth, "currentColor");
}

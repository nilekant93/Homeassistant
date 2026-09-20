import { css } from "lit";

/**
 * Design tokens, lifted verbatim from the Claude Design source.
 *
 * Both palettes are defined on `:host([data-theme=…])` rather than through a
 * media query: the tablet picks its theme explicitly in Settings, and the HA
 * companion app's own light/dark state is irrelevant to a kiosk display.
 */
export const tokens = css`
  :host {
    --bg: #fbf9f5;
    --surface: #ffffff;
    --surface-2: #f2efe8;
    --text: #21201b;
    --text-muted: #726e64;
    --border: #e7e2d6;
    --accent-amber: #c17a3c;
    --accent-amber-soft: #f4e1c9;
    --accent-teal: #3e8c86;
    --accent-teal-soft: #dcefec;
    --on-amber: #241a10;
    --shadow: 0 1px 2px rgba(33, 32, 27, 0.05), 0 10px 28px rgba(33, 32, 27, 0.06);
    /* Surface you can see through — used by the room chips on the vacuum map
       so the cleaned path stays visible underneath them. Written out per
       theme rather than mixed at runtime: color-mix is recent enough that an
       older WebView would silently drop the background entirely. */
    --surface-veil: rgba(255, 255, 255, 0.62);

    --font-body: "IBM Plex Sans", system-ui, -apple-system, sans-serif;
    --font-display: "Space Grotesk", "IBM Plex Sans", system-ui, sans-serif;
  }

  :host([data-theme="dark"]) {
    --bg: #17181c;
    --surface: #1f2126;
    --surface-2: #26282e;
    --text: #f1efe9;
    --text-muted: #9c988e;
    --border: #2e3036;
    --accent-amber: #e5a868;
    --accent-amber-soft: #3b2e1c;
    --accent-teal: #5fb6af;
    --accent-teal-soft: #1d3230;
    --on-amber: #241a10;
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.35), 0 10px 28px rgba(0, 0, 0, 0.4);
    --surface-veil: rgba(31, 33, 38, 0.62);
  }
`;

/** Resets shared by every component in the app. */
export const base = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  button {
    font: inherit;
    color: inherit;
    border: none;
    background: transparent;
    padding: 0;
    margin: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  /* A wall tablet has no text selection use case, and long-press selecting a
     label instead of toggling a light is a real annoyance. */
  :host {
    user-select: none;
    -webkit-user-select: none;
  }
`;

/**
 * The pill switch used by light cards, the hero card and the settings rows.
 *
 * The travel distance lives here with the dimensions rather than inline at
 * each call site — three copies of the same magic number drift apart the
 * moment the switch is resized.
 */
export const switchStyles = css`
  .track {
    width: 56px;
    height: 32px;
    border-radius: 16px;
    position: relative;
    flex: 0 0 56px;
    transition: background 180ms ease;
  }

  .knob {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #ffffff;
    position: absolute;
    top: 4px;
    left: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    transition: transform 180ms ease;
  }

  .track[data-on] .knob {
    transform: translateX(24px);
  }
`;

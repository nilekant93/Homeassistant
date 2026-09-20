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
    --bg: #f1e7d2;
    --surface: #fbf8f1;
    --surface-2: #e8dbbe;
    --text: #2b2013;
    --text-muted: #6f6248;
    --border: #dccba1;
    --accent-amber: #c17a3c;
    --accent-amber-soft: #f6ddac;
    --accent-teal: #3e8c86;
    --accent-teal-soft: #dcefec;
    --on-amber: #2b2013;
    --shadow: 0 1px 2px rgba(43, 32, 19, 0.07), 0 10px 28px rgba(43, 32, 19, 0.09);
    /* Surface you can see through — used by the room chips on the vacuum map
       so the cleaned path stays visible underneath them. Written out per
       theme rather than mixed at runtime: color-mix is recent enough that an
       older WebView would silently drop the background entirely. */
    --surface-veil: rgba(251, 248, 241, 0.62);

    --font-body: "IBM Plex Sans", system-ui, -apple-system, sans-serif;
    --font-display: "Space Grotesk", "IBM Plex Sans", system-ui, sans-serif;
  }

  :host([data-theme="dark"]) {
    --bg: #1c1712;
    --surface: #241d15;
    --surface-2: #2d2419;
    --text: #f1e7d6;
    --text-muted: #a89a80;
    --border: #3a2f20;
    --accent-amber: #e5a868;
    --accent-amber-soft: #3d2e1a;
    --accent-teal: #5fb6af;
    --accent-teal-soft: #1d3230;
    --on-amber: #2b2013;
    --shadow: 0 1px 2px rgba(10, 6, 2, 0.4), 0 10px 28px rgba(10, 6, 2, 0.45);
    --surface-veil: rgba(36, 29, 21, 0.62);
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
    /* The palette's off-white rather than pure white, which was the one
       cold value left in an otherwise warm interface. */
    background: #fbf8f1;
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

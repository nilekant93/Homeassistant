// The two families the design uses, inlined as data: URIs at build time so a
// wall tablet with no internet still renders the right typography.
//
// @font-face must live in the main document — a declaration inside a shadow
// root does not apply — so these are injected into <head> once on load.
import ibmPlex400 from "@fontsource/ibm-plex-sans/latin-400.css?inline";
import ibmPlex600 from "@fontsource/ibm-plex-sans/latin-600.css?inline";
import spaceGrotesk600 from "@fontsource/space-grotesk/latin-600.css?inline";

const STYLE_ID = "kotitabletti-fonts";

export function installFonts() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = [ibmPlex400, ibmPlex600, spaceGrotesk600].join("\n");
  document.head.appendChild(style);
}

import { installFonts } from "./fonts";
import "./app";

installFonts();

// Lets the card appear in Lovelace's "Add card" picker.
interface CustomCardEntry {
  type: string;
  name: string;
  description: string;
  preview: boolean;
}

const registry = ((window as unknown as { customCards?: CustomCardEntry[] }).customCards ??= []);

registry.push({
  type: "kotitabletti-app",
  name: "Kotitabletti",
  description: "Koko näytön käyttöliittymä seinätabletille",
  // The card only makes sense at 1280 × 800 in a panel view, so a thumbnail in
  // the picker would be misleading.
  preview: false,
});

console.info("%c KOTITABLETTI %c 0.1.1 ", "background:#C17A3C;color:#241A10;font-weight:600", "");

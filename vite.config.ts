import { defineConfig } from "vite";

// Builds one self-contained ES module that Home Assistant loads as a Lovelace
// resource. Fonts are inlined as data: URIs so the wall tablet never depends on
// reaching fonts.googleapis.com.
export default defineConfig({
  build: {
    lib: {
      entry: "src/main.ts",
      formats: ["es"],
      fileName: () => "kotitabletti.js",
    },
    // Well above the largest woff2 subset we ship, so every font lands inline.
    assetsInlineLimit: 512 * 1024,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    target: "es2022",
    minify: "esbuild",
  },
});

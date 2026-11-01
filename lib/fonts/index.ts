import localFont from "next/font/local";

// Shared by both root layouts. Legacy-only fonts are in ./legacy: Next preloads
// every font a module declares, so they stay out of this one.
//
// Self-hosted, so a build never depends on Google. Files come from the Fontsource
// npm packages (SIL Open Font License, see ./licenses). Why this matters:
// test/guards/self-hosted-fonts.test.ts.

// Above the fold, so it preloads.
export const inter = localFont({
  src: "./inter-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-sans",
  display: "swap",
});

// v2 paints no mono above the fold.
export const jetbrainsMono = localFont({
  src: "./jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

// CV template fonts: only the CV preview uses them, so they never block first paint.
export const merriweather = localFont({
  src: [
    { path: "./merriweather-latin-300-normal.woff2", weight: "300" },
    { path: "./merriweather-latin-400-normal.woff2", weight: "400" },
    { path: "./merriweather-latin-700-normal.woff2", weight: "700" },
    { path: "./merriweather-latin-900-normal.woff2", weight: "900" },
  ],
  variable: "--font-merriweather",
  display: "swap",
  preload: false,
});

export const lato = localFont({
  src: [
    { path: "./lato-latin-300-normal.woff2", weight: "300" },
    { path: "./lato-latin-400-normal.woff2", weight: "400" },
    { path: "./lato-latin-700-normal.woff2", weight: "700" },
    { path: "./lato-latin-900-normal.woff2", weight: "900" },
  ],
  variable: "--font-lato",
  display: "swap",
  preload: false,
});

export const montserrat = localFont({
  src: "./montserrat-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-montserrat",
  display: "swap",
  preload: false,
});

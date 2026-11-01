import localFont from "next/font/local";

// Fonts only the legacy root layout uses, in their own module so v2 never preloads them.

// The legacy pages paint these above the fold.
export const playfair = localFont({
  src: "./playfair-display-latin-wght-normal.woff2",
  weight: "400 900",
  variable: "--font-playfair",
  display: "swap",
});

export const jetbrainsMonoEager = localFont({
  src: "./jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  variable: "--font-mono",
  display: "swap",
});

// RTL UI. A local font cannot carry a unicode-range per file, so Rubik's two
// subsets are two fonts and globals.css stacks them.
export const rubikHebrew = localFont({
  src: "./rubik-hebrew-wght-normal.woff2",
  weight: "300 900",
  variable: "--font-hebrew",
  display: "swap",
  preload: false,
});

export const rubikLatin = localFont({
  src: "./rubik-latin-wght-normal.woff2",
  weight: "300 900",
  variable: "--font-hebrew-latin",
  display: "swap",
  preload: false,
});

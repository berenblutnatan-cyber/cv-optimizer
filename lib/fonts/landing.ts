import localFont from "next/font/local";

// The landing's pen. Here, not in ./index, so the app never preloads it.
// The serif moved to ./index when page titles took it up.
export { instrumentSerif } from "./index";

export const caveat = localFont({
  src: "./caveat-latin-700-normal.woff2",
  weight: "700",
  variable: "--font-pen",
  display: "swap",
  preload: false,
});

// The pen in Hebrew: Caveat has no Hebrew letters. Limited to Hebrew glyphs, so
// digits and Latin keep Caveat and only Hebrew pages download it.
export const amaticHebrew = localFont({
  src: "./amatic-sc-hebrew-700-normal.woff2",
  weight: "700",
  variable: "--font-pen-he",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F" }],
});

import localFont from "next/font/local";

// The landing's two voices. Here, not in ./index, so the app never preloads them.

export const instrumentSerif = localFont({
  src: [
    { path: "./instrument-serif-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-serif",
  display: "swap",
});

export const caveat = localFont({
  src: "./caveat-latin-700-normal.woff2",
  weight: "700",
  variable: "--font-pen",
  display: "swap",
  preload: false,
});

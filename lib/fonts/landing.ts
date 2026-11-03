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

import type { Config } from "tailwindcss";
import legacy from "./tailwind.config";

// The 18 CV templates are styled with the legacy Tailwind theme (its palette,
// type scale and shadows). v2's app theme deliberately doesn't generate those,
// so documents get their own stylesheet: the legacy config, scoped to `.cv-doc`
// (every utility is `.cv-doc .x`), with no second preflight. Nothing here can
// leak into the app UI, and nothing from the app theme can restyle a CV.
const config: Config = {
  ...legacy,
  content: ["./components/cv-templates/**/*.{ts,tsx}"],
  important: ".cv-doc",
  corePlugins: { ...(legacy.corePlugins as object | undefined), preflight: false },
};

export default config;

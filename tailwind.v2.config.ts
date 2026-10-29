import type { Config } from "tailwindcss";

// Hired v2 "Precision studio" theme. Loaded only by styles/v2/app.css via
// `@config`, so legacy pages keep tailwind.config.ts and the two never mix.
// Every value here is a token role; components never use raw hex or px.
const c = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/(v2)/**/*.{ts,tsx,mdx}",
    "./components/ui/**/*.{ts,tsx}",
    "./components/v2/**/*.{ts,tsx}",
  ],
  theme: {
    // Replace, not extend: the default palette and type scale are not allowed.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      canvas: c("canvas"),
      surface: c("surface"),
      "surface-2": c("surface2"),
      hairline: c("hairline"),
      "hairline-strong": c("hairline-strong"),
      control: c("control"),
      ink: c("ink"),
      "ink-2": c("ink2"),
      "ink-3": c("ink3"),
      accent: c("accent"),
      "accent-hover": c("accent-hover"),
      "accent-ink": c("accent-ink"),
      "accent-wash": c("accent-wash"),
      "on-accent": c("on-accent"),
      success: c("success"),
      "success-wash": c("success-wash"),
      warn: c("warn"),
      "warn-wash": c("warn-wash"),
      danger: c("danger"),
      "danger-wash": c("danger-wash"),
      black: "#000",
      white: "#fff",
    },
    fontSize: {
      // 14px is the floor (house rules). No xs, no 11-12px.
      dense: ["14px", { lineHeight: "20px" }],
      body: ["15px", { lineHeight: "22px" }],
      emph: ["16px", { lineHeight: "24px" }],
      h3: ["18px", { lineHeight: "26px" }],
      h2: ["22px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
      h1: ["28px", { lineHeight: "34px", letterSpacing: "-0.02em" }],
      display: ["40px", { lineHeight: "44px", letterSpacing: "-0.03em" }],
      hero: ["56px", { lineHeight: "60px", letterSpacing: "-0.035em" }],
    },
    fontFamily: {
      sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      mono: ["var(--font-mono)", "ui-monospace", "monospace"],
    },
    borderRadius: {
      none: "0",
      control: "6px",
      card: "10px",
      panel: "14px",
      full: "9999px",
    },
    boxShadow: {
      none: "none",
      card: "var(--shadow-card)",
      pop: "var(--shadow-pop)",
    },
    extend: {
      transitionTimingFunction: { DEFAULT: "var(--ease)", out: "var(--ease)" },
      transitionDuration: { DEFAULT: "150ms", micro: "150ms", panel: "220ms" },
      spacing: { 13: "52px", 14: "56px", 15: "60px", 18: "72px", 60: "240px", 110: "440px" },
      maxWidth: { shell: "1440px", prose: "64ch" },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "pop-in": {
          from: { opacity: "0", transform: "translateY(4px) scale(.98)" },
          to: { opacity: "1", transform: "none" },
        },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        "flash-patch": {
          "0%": { backgroundColor: "rgb(var(--c-accent-wash) / 1)" },
          "100%": { backgroundColor: "rgb(var(--c-accent-wash) / 0)" },
        },
        breathe: { "0%,100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.06)" } },
      },
      animation: {
        "fade-in": "fade-in 150ms var(--ease) both",
        "pop-in": "pop-in 180ms var(--ease) both",
        shimmer: "shimmer 1.6s linear infinite",
        "flash-patch": "flash-patch 1.2s var(--ease) both",
        breathe: "breathe 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

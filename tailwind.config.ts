import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "Apple Color Emoji",
          "Segoe UI Emoji",
        ],
        serif: [
          "var(--font-playfair)",
          "Playfair Display",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif",
        ],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      colors: {
        // Hired brand colors - Professional Indigo palette
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",  // Main brand color
          700: "#4338ca",  // Hover state
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        // Glass-theme palette — sourced from CSS vars so JS can override.
        glass: {
          DEFAULT: "rgba(20, 18, 38, 0.45)",
          strong: "rgba(20, 18, 38, 0.65)",
          border: "rgba(255, 255, 255, 0.12)",
          highlight: "rgba(255, 255, 255, 0.06)",
        },
        warm: "#f5b8c8",
        cool: "#8fb3ff",
      },
      backdropBlur: {
        glass: "24px",
      },
      borderRadius: {
        squircle: "28%",
      },
      boxShadow: {
        soft: "0 2px 20px -6px rgba(0, 0, 0, 0.06)",
        card: "0 4px 40px -12px rgba(0, 0, 0, 0.08)",
        lift: "0 8px 30px -8px rgba(0, 0, 0, 0.10)",
        modal: "0 8px 60px -12px rgba(0, 0, 0, 0.25)",
        glow: "0 0 0 1px rgba(255,255,255,0.12), 0 20px 60px -20px rgba(20,18,38,0.6)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.25s ease-out both",
        "cta-glow": "ctaGlow 2.4s ease-in-out infinite",
        "shimmer-x": "shimmerX 2.8s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        ctaGlow: {
          "0%, 100%": {
            boxShadow:
              "0 8px 30px -8px rgba(184, 134, 11, 0.45), 0 0 0 0 rgba(184, 134, 11, 0.35)",
          },
          "50%": {
            boxShadow:
              "0 10px 36px -6px rgba(184, 134, 11, 0.55), 0 0 0 6px rgba(184, 134, 11, 0)",
          },
        },
        shimmerX: {
          "0%": { transform: "translateX(-120%) skewX(-12deg)" },
          "60%, 100%": { transform: "translateX(220%) skewX(-12deg)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

// CV accent palette: the single source for templates, the editor and exports.
// Server-safe (no React, no "use client").

// Theme color options - 8 accent colors (Professional Indigo/Violet Rebrand)
export type ThemeColor = 
  | "indigo"
  | "blue" 
  | "purple" 
  | "rose" 
  | "amber" 
  | "slate"
  | "navy"
  | "violet"
  | "orange"
  | "black";

// Color palette with hex values for inline styling
export const THEME_COLOR_VALUES: Record<ThemeColor, { primary: string; dark: string; light: string; ring: string }> = {
  indigo: { primary: "#6366f1", dark: "#4f46e5", light: "#e0e7ff", ring: "ring-indigo-500" },
  blue: { primary: "#3b82f6", dark: "#2563eb", light: "#dbeafe", ring: "ring-blue-500" },
  purple: { primary: "#8b5cf6", dark: "#7c3aed", light: "#ede9fe", ring: "ring-purple-500" },
  rose: { primary: "#f43f5e", dark: "#e11d48", light: "#ffe4e6", ring: "ring-rose-500" },
  amber: { primary: "#f59e0b", dark: "#d97706", light: "#fef3c7", ring: "ring-amber-500" },
  slate: { primary: "#475569", dark: "#334155", light: "#f1f5f9", ring: "ring-slate-500" },
  navy: { primary: "#1e3a8a", dark: "#1e40af", light: "#dbeafe", ring: "ring-blue-900" },
  violet: { primary: "#8b5cf6", dark: "#7c3aed", light: "#ede9fe", ring: "ring-violet-500" },
  orange: { primary: "#f97316", dark: "#ea580c", light: "#ffedd5", ring: "ring-orange-500" },
  black: { primary: "#18181b", dark: "#09090b", light: "#f4f4f5", ring: "ring-zinc-900" },
};

export type AccentPalette = { primary: string; dark: string; light: string; ring: string };

/** An exact colour, as an imported CV used it ("#0f9b8e"). The named colours above are presets. */
export type AccentHex = `#${string}`;

export const isAccentHex = (v: unknown): v is AccentHex => typeof v === "string" && /^#[0-9a-f]{6}$/.test(v);

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb: number[]) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;
const mix = (hex: string, to: number, amount: number) => toHex(channels(hex).map((c) => c + (to - c) * amount));

/**
 * The palette every template and export reads: a preset by name, or one made
 * from an exact colour, so a CV keeps the colour it came with. Unknown → indigo.
 */
export function accentPalette(accent: string | undefined | null): AccentPalette {
  if (isAccentHex(accent)) return { primary: accent, dark: mix(accent, 0, 0.18), light: mix(accent, 255, 0.88), ring: "ring-zinc-900" };
  return THEME_COLOR_VALUES[accent as ThemeColor] ?? THEME_COLOR_VALUES.indigo;
}

/** How far apart two colours look (0 = same). Plain RGB distance, weighted for the eye. */
export function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = channels(a);
  const [r2, g2, b2] = channels(b);
  const rm = (r1 + r2) / 2;
  return Math.sqrt((2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2);
}

/** The preset closest to an exact colour, or the colour itself when no preset is close. */
export function nearestAccent(hex: AccentHex): ThemeColor | AccentHex {
  let best: ThemeColor = "black";
  let bestD = Infinity;
  for (const [name, v] of Object.entries(THEME_COLOR_VALUES) as [ThemeColor, AccentPalette][]) {
    const d = Math.min(colorDistance(hex, v.primary), colorDistance(hex, v.dark));
    if (d < bestD) [best, bestD] = [name, d];
  }
  return bestD <= 40 ? best : hex;
}

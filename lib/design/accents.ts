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

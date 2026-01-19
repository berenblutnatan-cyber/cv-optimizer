/**
 * Theme Engine
 * 
 * Dynamic color system for resume templates.
 * Provides consistent theming across all 8 template archetypes.
 */

import { ThemeColor, THEME_COLOR_VALUES } from "@/context/BuilderContext";

// ==========================================
// THEME COLORS
// ==========================================

export interface ThemeColors {
  primary: string;
  dark: string;
  light: string;
  ring: string;
}

// Default fallback color (Indigo brand)
const DEFAULT_THEME: ThemeColors = {
  primary: "#6366f1",
  dark: "#4f46e5",
  light: "#e0e7ff",
  ring: "ring-indigo-500",
};

export function getThemeColors(theme?: ThemeColor | string): ThemeColors {
  if (!theme) return DEFAULT_THEME;
  return THEME_COLOR_VALUES[theme as ThemeColor] || DEFAULT_THEME;
}

// ==========================================
// FONT FAMILIES
// ==========================================

export const FONTS = {
  // Serif fonts for traditional templates
  serif: {
    heading: "var(--font-merriweather), Merriweather, Georgia, 'Times New Roman', serif",
    body: "var(--font-merriweather), Merriweather, Georgia, serif",
  },
  // Sans-serif for modern templates
  sans: {
    heading: "var(--font-montserrat), Montserrat, 'Helvetica Neue', sans-serif",
    body: "var(--font-sans), Inter, 'Segoe UI', sans-serif",
  },
  // Clean sans for minimalist
  clean: {
    heading: "var(--font-lato), Lato, 'Helvetica Neue', sans-serif",
    body: "var(--font-lato), Lato, sans-serif",
  },
  // Mono for techie
  mono: {
    heading: "var(--font-mono), 'JetBrains Mono', 'Fira Code', monospace",
    body: "var(--font-sans), Inter, sans-serif",
  },
} as const;

// ==========================================
// TYPOGRAPHY SCALE
// ==========================================

export const TYPE_SCALE = {
  // Resume name
  name: {
    large: { fontSize: "32px", fontWeight: 700, lineHeight: 1.1 },
    medium: { fontSize: "28px", fontWeight: 700, lineHeight: 1.2 },
    small: { fontSize: "24px", fontWeight: 700, lineHeight: 1.2 },
  },
  // Professional title
  title: {
    large: { fontSize: "14px", fontWeight: 500, letterSpacing: "0.1em" },
    medium: { fontSize: "12px", fontWeight: 500, letterSpacing: "0.08em" },
    small: { fontSize: "11px", fontWeight: 500, letterSpacing: "0.05em" },
  },
  // Section headers
  section: {
    large: { fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em" },
    medium: { fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em" },
    small: { fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em" },
  },
  // Job titles
  itemTitle: {
    large: { fontSize: "13px", fontWeight: 600, lineHeight: 1.3 },
    medium: { fontSize: "12px", fontWeight: 600, lineHeight: 1.3 },
    small: { fontSize: "11px", fontWeight: 600, lineHeight: 1.3 },
  },
  // Body text
  body: {
    large: { fontSize: "11px", fontWeight: 400, lineHeight: 1.6 },
    medium: { fontSize: "10px", fontWeight: 400, lineHeight: 1.5 },
    small: { fontSize: "9px", fontWeight: 400, lineHeight: 1.5 },
  },
  // Dates
  date: {
    large: { fontSize: "11px", fontWeight: 500 },
    medium: { fontSize: "10px", fontWeight: 500 },
    small: { fontSize: "9px", fontWeight: 500 },
  },
} as const;

// ==========================================
// TEMPLATE METADATA
// ==========================================

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: "professional" | "creative" | "technical" | "classic";
  fonts: keyof typeof FONTS;
  layout: "single" | "sidebar" | "split" | "header";
  supportsPhoto: boolean;
  preview: string; // CSS gradient/pattern for thumbnail
}

export const TEMPLATE_METADATA: Record<string, TemplateMetadata> = {
  "modern-sidebar": {
    id: "modern-sidebar",
    name: "Modern Sidebar",
    description: "Two-column layout with skills on the left",
    category: "professional",
    fonts: "sans",
    layout: "sidebar",
    supportsPhoto: true,
    preview: "linear-gradient(135deg, #0f172a 35%, #ffffff 35%)",
  },
  "ivy-league": {
    id: "ivy-league",
    name: "Ivy League",
    description: "Classic serif typography, traditional layout",
    category: "classic",
    fonts: "serif",
    layout: "single",
    supportsPhoto: false,
    preview: "linear-gradient(180deg, #fafafa 0%, #f1f5f9 100%)",
  },
  "minimalist": {
    id: "minimalist",
    name: "Minimalist",
    description: "Clean whitespace, centered header",
    category: "professional",
    fonts: "clean",
    layout: "single",
    supportsPhoto: false,
    preview: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  },
  "executive": {
    id: "executive",
    name: "Executive",
    description: "Bold dark header, commanding presence",
    category: "professional",
    fonts: "sans",
    layout: "header",
    supportsPhoto: true,
    preview: "linear-gradient(180deg, #18181b 30%, #ffffff 30%)",
  },
  "techie": {
    id: "techie",
    name: "Techie",
    description: "Developer-focused with skills grid",
    category: "technical",
    fonts: "mono",
    layout: "single",
    supportsPhoto: false,
    preview: "linear-gradient(180deg, #1e293b 20%, #ffffff 20%)",
  },
  "creative": {
    id: "creative",
    name: "Creative",
    description: "Unique split design for designers",
    category: "creative",
    fonts: "sans",
    layout: "split",
    supportsPhoto: true,
    preview: "linear-gradient(135deg, #10b981 0%, #10b981 40%, #ffffff 40%)",
  },
  "startup": {
    id: "startup",
    name: "Startup",
    description: "Bold typography, modern accents",
    category: "creative",
    fonts: "sans",
    layout: "single",
    supportsPhoto: false,
    preview: "linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)",
  },
  "international": {
    id: "international",
    name: "International",
    description: "Standardized with photo support",
    category: "professional",
    fonts: "clean",
    layout: "sidebar",
    supportsPhoto: true,
    preview: "linear-gradient(135deg, #f8fafc 35%, #ffffff 35%)",
  },
};

// ==========================================
// STYLE HELPERS
// ==========================================

/**
 * Create inline style object for themed elements
 */
export function themedStyle(
  colors: ThemeColors,
  type: "text" | "bg" | "border" | "accent"
): React.CSSProperties {
  switch (type) {
    case "text":
      return { color: colors.primary };
    case "bg":
      return { backgroundColor: colors.primary };
    case "border":
      return { borderColor: colors.primary };
    case "accent":
      return { 
        color: colors.primary,
        borderColor: colors.primary,
      };
    default:
      return {};
  }
}

/**
 * Create section header styles for a specific template
 */
export function sectionHeaderStyle(
  colors: ThemeColors,
  variant: "underline" | "background" | "accent" | "minimal"
): React.CSSProperties {
  const base: React.CSSProperties = {
    fontSize: TYPE_SCALE.section.medium.fontSize,
    fontWeight: TYPE_SCALE.section.medium.fontWeight,
    letterSpacing: TYPE_SCALE.section.medium.letterSpacing,
    textTransform: "uppercase",
    marginBottom: "12px",
  };

  switch (variant) {
    case "underline":
      return {
        ...base,
        color: colors.primary,
        paddingBottom: "8px",
        borderBottom: `2px solid ${colors.primary}`,
      };
    case "background":
      return {
        ...base,
        color: "#ffffff",
        backgroundColor: colors.primary,
        padding: "6px 12px",
        borderRadius: "4px",
      };
    case "accent":
      return {
        ...base,
        color: "#1e293b",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      };
    case "minimal":
      return {
        ...base,
        color: "#374151",
        borderBottom: "1px solid #e5e7eb",
        paddingBottom: "6px",
      };
    default:
      return base;
  }
}

/**
 * Create skill bar/tag styles
 */
export function skillStyle(
  colors: ThemeColors,
  variant: "bar" | "tag" | "dot" | "pill"
): React.CSSProperties {
  switch (variant) {
    case "bar":
      return {
        height: "6px",
        backgroundColor: colors.light,
        borderRadius: "3px",
      };
    case "tag":
      return {
        display: "inline-block",
        padding: "4px 10px",
        backgroundColor: colors.light,
        color: colors.dark,
        borderRadius: "4px",
        fontSize: "9px",
        fontWeight: 500,
      };
    case "dot":
      return {
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        backgroundColor: colors.primary,
      };
    case "pill":
      return {
        display: "inline-block",
        padding: "3px 8px",
        border: `1px solid ${colors.primary}`,
        color: colors.primary,
        borderRadius: "12px",
        fontSize: "9px",
        fontWeight: 500,
      };
    default:
      return {};
  }
}

// ==========================================
// EXPORTS
// ==========================================

export { THEME_COLOR_VALUES };

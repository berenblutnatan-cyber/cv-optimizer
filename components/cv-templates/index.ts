"use client";

import React from "react";

// ==========================================
// CORE ARCHITECTURE
// ==========================================
export { A4PageWrapper, A4SafeArea, A4Grid } from "./A4PageWrapper";

// ==========================================
// THEME ENGINE
// ==========================================
export { 
  getThemeColors,
  FONTS,
  TYPE_SCALE,
  TEMPLATE_METADATA,
  themedStyle,
  sectionHeaderStyle,
  skillStyle,
} from "./ThemeEngine";
export type { ThemeColors, TemplateMetadata } from "./ThemeEngine";

// ==========================================
// NEW TEMPLATE COMPONENTS (8 Archetypes)
// ==========================================
export {
  ModernSidebarTemplate,
  IvyLeagueTemplate,
  MinimalistTemplate,
  ExecutiveTemplate,
  TechieTemplate,
  CreativeTemplate as CreativeTemplateNew,
  StartupTemplate,
  InternationalTemplate,
} from "./templates";

// ==========================================
// LEGACY TEMPLATE COMPONENTS
// ==========================================
import { HarvardTemplate } from "./HarvardTemplate";
import { ModernTemplate } from "./ModernTemplate";
import { CreativeTemplate } from "./CreativeTemplate";
import { ModernSidebar } from "./ModernSidebar";

// Re-export individual templates for direct imports
export { HarvardTemplate } from "./HarvardTemplate";
export { ModernTemplate } from "./ModernTemplate";
export { CreativeTemplate } from "./CreativeTemplate";
export { ModernSidebar } from "./ModernSidebar";

// ==========================================
// TYPE DEFINITIONS
// ==========================================

/** Template IDs for the new architecture */
export type TemplateId = "ivy" | "modern" | "executive" | "modern-sidebar";

/** Legacy type for backwards compatibility */
export type TemplateType = "harvard" | "modern" | "creative";

/** All template IDs */
export type AllTemplateId =
  | "modern-sidebar"
  | "ivy-league"
  | "minimalist"
  | "executive"
  | "techie"
  | "creative"
  | "startup"
  | "international"
  | "aurora"
  | "banner"
  | "spotlight"
  | "ledger"
  | "devfolio"
  | "canvas"
  | "timeline"
  | "double-column"
  | "compact"
  | "photo-left";

/** Template props interface - all templates must accept these */
export interface TemplateProps {
  data: string;
  photo?: string;
}

/** Template configuration interface */
export interface TemplateConfig {
  component: React.ComponentType<TemplateProps>;
  name: string;
  description: string;
  preview: string;
  /** Whether template uses the new A4PageWrapper architecture */
  tier?: 1 | 2;
  /** Layout type for filtering/sorting */
  layout?: "single-column" | "two-column" | "sidebar";
}

// ==========================================
// ALL 8 TEMPLATES REGISTRY
// ==========================================

/**
 * ALL_TEMPLATES - Complete registry of all 8 template archetypes
 * Used by the builder download section and preview cards
 */
export const ALL_TEMPLATES: Record<AllTemplateId, {
  name: string;
  description: string;
  preview: string;
  category: "professional" | "classic" | "creative" | "technical";
  /** Free templates are usable by everyone; premium ones cost 1 credit to unlock per user. */
  isPremium?: boolean;
}> = {
  "modern-sidebar": {
    name: "Modern Professional",
    description: "Two-column with dark sidebar. Perfect for tech & business roles.",
    preview: "linear-gradient(135deg, #0f172a 35%, #ffffff 35%)",
    category: "professional",
    isPremium: true,
  },
  "ivy-league": {
    name: "Ivy League",
    description: "Classic serif elegance. Ideal for legal, academic & executive roles.",
    preview: "linear-gradient(180deg, #fafafa 0%, #f1f5f9 100%)",
    category: "classic",
    // The only free / default template. Everyone gets this without paying.
  },
  "minimalist": {
    name: "Minimalist",
    description: "Clean whitespace design. Great for modern creative roles.",
    preview: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    category: "professional",
    isPremium: true,
  },
  "executive": {
    name: "Executive",
    description: "Bold dark header for senior professionals & consultants.",
    preview: "linear-gradient(180deg, #111827 30%, #ffffff 30%)",
    category: "professional",
    isPremium: true,
  },
  "techie": {
    name: "Techie",
    description: "Developer-focused with skills grid. Perfect for engineers.",
    preview: "linear-gradient(180deg, #1e293b 20%, #ffffff 20%)",
    category: "technical",
    isPremium: true,
  },
  "creative": {
    name: "Creative",
    description: "Unique split design. Made for designers & marketers.",
    preview: "linear-gradient(135deg, #10b981 35%, #ffffff 35%)",
    category: "creative",
    isPremium: true,
  },
  "startup": {
    name: "Startup",
    description: "Bold modern typography. Great for innovative companies.",
    preview: "linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)",
    category: "creative",
    isPremium: true,
  },
  "international": {
    name: "International",
    description: "Photo support, standardized format. Common in Europe.",
    preview: "linear-gradient(135deg, #f1f5f9 30%, #ffffff 30%)",
    category: "professional",
    isPremium: true,
  },
  "aurora": {
    name: "Aurora",
    description: "Accent rail + tinted header. Colorful but clean for PM & business roles.",
    preview: "linear-gradient(90deg, #6366f1 7%, #eef2ff 7%, #ffffff 60%)",
    category: "professional",
    isPremium: true,
  },
  "banner": {
    name: "Banner",
    description: "Full-width color banner header. Confident and modern, still one page.",
    preview: "linear-gradient(180deg, #4f46e5 28%, #ffffff 28%)",
    category: "professional",
    isPremium: true,
  },
  "spotlight": {
    name: "Spotlight",
    description: "Centered, airy and maximally ATS-safe. Great default for any role.",
    preview: "linear-gradient(180deg, #ffffff 0%, #eef2ff 100%)",
    category: "professional",
    isPremium: true,
  },
  "ledger": {
    name: "Ledger",
    description: "Editorial serif with a date rail. Elegant for finance, law & consulting.",
    preview: "linear-gradient(180deg, #fbf6ec 0%, #f3ece0 100%)",
    category: "classic",
    isPremium: true,
  },
  "devfolio": {
    name: "Devfolio",
    description: "Monospace README style with a skills grid. Built for developers.",
    preview: "linear-gradient(180deg, #0f172a 7%, #ffffff 7%)",
    category: "technical",
    isPremium: true,
  },
  "canvas": {
    name: "Canvas",
    description: "Bold accent sidebar with photo. Personality for designers & creatives.",
    preview: "linear-gradient(120deg, #6366f1 34%, #ffffff 34%)",
    category: "creative",
    isPremium: true,
  },
  "timeline": {
    name: "Timeline",
    description: "A vertical timeline rail that tells your career as a story.",
    preview: "linear-gradient(90deg, #6366f1 6%, #ffffff 6%)",
    category: "professional",
    isPremium: true,
  },
  "double-column": {
    name: "Double Column",
    description: "Full header over two balanced light columns. Clean and compact.",
    preview: "linear-gradient(90deg, #ffffff 60%, #f1f5f9 60%)",
    category: "professional",
    isPremium: true,
  },
  "compact": {
    name: "Compact",
    description: "Dense, ATS-friendly single column. Fits more on one page.",
    preview: "linear-gradient(180deg, #6366f1 5%, #ffffff 5%)",
    category: "professional",
    isPremium: true,
  },
  "photo-left": {
    name: "Photo Left",
    description: "Photo rail with contact & skills beside your story.",
    preview: "linear-gradient(90deg, #e0e7ff 34%, #ffffff 34%)",
    category: "professional",
    isPremium: true,
  },
};

export const DEFAULT_FREE_TEMPLATE_ID: AllTemplateId = "ivy-league";

/** Whether a template requires unlocking. */
export function isPremiumTemplate(id: string): boolean {
  return !!ALL_TEMPLATES[id as AllTemplateId]?.isPremium;
}

// ==========================================
// TEMPLATE REGISTRY (Legacy 4)
// ==========================================

/**
 * TEMPLATES - Main template registry
 * 
 * All available templates with their metadata.
 * New templates should be added here with tier: 1 to indicate
 * they use the new A4PageWrapper architecture.
 */
export const TEMPLATES: Record<TemplateId, TemplateConfig> = {
  "ivy": {
    component: HarvardTemplate,
    name: "The Ivy",
    description: "Classical serif design with black & white elegance. Ideal for legal, academic & executive roles.",
    preview: "/templates/ivy-preview.png",
    tier: 2,
    layout: "single-column",
  },
  "modern": {
    component: ModernTemplate,
    name: "The Modern",
    description: "Clean sans-serif with emerald accents. Perfect for tech, business & startup roles.",
    preview: "/templates/modern-preview.png",
    tier: 2,
    layout: "single-column",
  },
  "executive": {
    component: CreativeTemplate,
    name: "Executive",
    description: "Professional two-column layout with dark sidebar. Great for senior professionals & consultants.",
    preview: "/templates/executive-preview.png",
    tier: 2,
    layout: "two-column",
  },
  "modern-sidebar": {
    component: ModernSidebar,
    name: "Modern Professional",
    description: "Premium two-column layout with dark slate sidebar. Perfect for tech professionals, designers & modern business roles.",
    preview: "/templates/modern-sidebar-preview.png",
    tier: 1,
    layout: "sidebar",
  },
};

// ==========================================
// LEGACY SUPPORT
// ==========================================

/**
 * TEMPLATE_INFO - Legacy support for existing components
 */
export const TEMPLATE_INFO: Record<TemplateType, { name: string; description: string }> = {
  harvard: {
    name: "The Ivy",
    description: "Classical serif design with black & white elegance. Ideal for legal, academic & executive roles.",
  },
  modern: {
    name: "The Modern",
    description: "Clean sans-serif with emerald accents. Perfect for tech, business & startup roles.",
  },
  creative: {
    name: "Executive",
    description: "Professional two-column layout with dark sidebar. Great for senior professionals & consultants.",
  },
};

/**
 * TEMPLATE_COMPONENTS - Legacy component mapping for existing consumers
 */
export const TEMPLATE_COMPONENTS: Record<TemplateType, React.ComponentType<TemplateProps>> = {
  harvard: HarvardTemplate,
  modern: ModernTemplate,
  creative: CreativeTemplate,
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/** Map for normalizing template IDs */
const ID_MAP: Record<string, TemplateId> = {
  // Legacy IDs
  harvard: "ivy",
  creative: "executive",
  // Current IDs
  ivy: "ivy",
  modern: "modern",
  executive: "executive",
  "modern-sidebar": "modern-sidebar",
};

/**
 * Get template by ID (supports both new and legacy IDs)
 */
export function getTemplate(id: TemplateId | TemplateType | string): TemplateConfig | undefined {
  const normalizedId = ID_MAP[id] || id;
  return TEMPLATES[normalizedId as TemplateId];
}

/**
 * Get all template IDs
 */
export function getTemplateIds(): TemplateId[] {
  return Object.keys(TEMPLATES) as TemplateId[];
}

/**
 * Get templates by tier
 */
export function getTemplatesByTier(tier: 1 | 2): TemplateConfig[] {
  return Object.values(TEMPLATES).filter(t => t.tier === tier);
}

/**
 * Get templates by layout type
 */
export function getTemplatesByLayout(layout: TemplateConfig["layout"]): TemplateConfig[] {
  return Object.values(TEMPLATES).filter(t => t.layout === layout);
}

/**
 * Check if a template ID is valid
 */
export function isValidTemplateId(id: string): id is TemplateId {
  return id in TEMPLATES || id in ID_MAP;
}

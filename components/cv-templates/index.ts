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

/** All 8 template IDs */
export type AllTemplateId = 
  | "modern-sidebar" 
  | "ivy-league" 
  | "minimalist" 
  | "executive" 
  | "techie" 
  | "creative" 
  | "startup" 
  | "international";

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
}> = {
  "modern-sidebar": {
    name: "Modern Professional",
    description: "Two-column with dark sidebar. Perfect for tech & business roles.",
    preview: "linear-gradient(135deg, #0f172a 35%, #ffffff 35%)",
    category: "professional",
  },
  "ivy-league": {
    name: "Ivy League",
    description: "Classic serif elegance. Ideal for legal, academic & executive roles.",
    preview: "linear-gradient(180deg, #fafafa 0%, #f1f5f9 100%)",
    category: "classic",
  },
  "minimalist": {
    name: "Minimalist",
    description: "Clean whitespace design. Great for modern creative roles.",
    preview: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    category: "professional",
  },
  "executive": {
    name: "Executive",
    description: "Bold dark header for senior professionals & consultants.",
    preview: "linear-gradient(180deg, #111827 30%, #ffffff 30%)",
    category: "professional",
  },
  "techie": {
    name: "Techie",
    description: "Developer-focused with skills grid. Perfect for engineers.",
    preview: "linear-gradient(180deg, #1e293b 20%, #ffffff 20%)",
    category: "technical",
  },
  "creative": {
    name: "Creative",
    description: "Unique split design. Made for designers & marketers.",
    preview: "linear-gradient(135deg, #10b981 35%, #ffffff 35%)",
    category: "creative",
  },
  "startup": {
    name: "Startup",
    description: "Bold modern typography. Great for innovative companies.",
    preview: "linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)",
    category: "creative",
  },
  "international": {
    name: "International",
    description: "Photo support, standardized format. Common in Europe.",
    preview: "linear-gradient(135deg, #f1f5f9 30%, #ffffff 30%)",
    category: "professional",
  },
};

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

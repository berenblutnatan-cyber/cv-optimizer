"use client";

import React from "react";
import {
  TEMPLATE_LIST,
  DEFAULT_FREE_TEMPLATE_ID,
  isPremiumTemplate,
  type TemplateRegistryId,
} from "@/lib/templates/registry";
import type { ResumeData as RegistryResumeData } from "./templates/TemplateProps";
import type { ThemeColor as RegistryThemeColor } from "@/context/BuilderContext";
import {
  ModernSidebarTemplate,
  IvyLeagueTemplate,
  MinimalistTemplate,
  ExecutiveTemplate,
  TechieTemplate,
  CreativeTemplate as CreativeTemplateNew,
  StartupTemplate,
  InternationalTemplate,
  AuroraTemplate,
  BannerTemplate,
  SpotlightTemplate,
  LedgerTemplate,
  DevfolioTemplate,
  CanvasTemplate,
  TimelineTemplate,
  DoubleColumnTemplate,
  CompactTemplate,
  PhotoLeftTemplate,
} from "./templates";

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

/** All template IDs — derived from the canonical registry. */
export type AllTemplateId = TemplateRegistryId;

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
// ALL TEMPLATES REGISTRY (derived)
// ==========================================

/**
 * ALL_TEMPLATES - Complete registry of all template archetypes.
 * Used by the builder download section and preview cards.
 *
 * Derived from the canonical registry in lib/templates/registry.ts — add or
 * edit templates THERE, never here.
 */
export const ALL_TEMPLATES: Record<AllTemplateId, {
  name: string;
  description: string;
  preview: string;
  category: "professional" | "classic" | "creative" | "technical";
  /** Free templates are usable by everyone; premium ones cost 1 credit to unlock per user. */
  isPremium?: boolean;
}> = Object.fromEntries(
  TEMPLATE_LIST.map((entry) => [
    entry.id,
    {
      name: entry.name,
      description: entry.detail,
      preview: entry.preview,
      category: entry.category,
      ...(entry.premium ? { isPremium: true } : {}),
    },
  ])
) as Record<AllTemplateId, {
  name: string;
  description: string;
  preview: string;
  category: "professional" | "classic" | "creative" | "technical";
  isPremium?: boolean;
}>;

// Re-exported from the canonical registry so existing imports keep working.
export { DEFAULT_FREE_TEMPLATE_ID, isPremiumTemplate };

/**
 * Component for every registry template id. Typed as a complete Record so the
 * build FAILS if a template is added to lib/templates/registry.ts without a
 * matching component — the guard that keeps lists and renderers in sync.
 */
export const TEMPLATE_COMPONENTS_BY_ID: Record<
  AllTemplateId,
  React.ComponentType<{ data: RegistryResumeData; themeColor: RegistryThemeColor; className?: string }>
> = {
  "modern-sidebar": ModernSidebarTemplate,
  "ivy-league": IvyLeagueTemplate,
  minimalist: MinimalistTemplate,
  executive: ExecutiveTemplate,
  techie: TechieTemplate,
  creative: CreativeTemplateNew,
  startup: StartupTemplate,
  international: InternationalTemplate,
  aurora: AuroraTemplate,
  banner: BannerTemplate,
  spotlight: SpotlightTemplate,
  ledger: LedgerTemplate,
  devfolio: DevfolioTemplate,
  canvas: CanvasTemplate,
  timeline: TimelineTemplate,
  "double-column": DoubleColumnTemplate,
  compact: CompactTemplate,
  "photo-left": PhotoLeftTemplate,
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
    // NOTE (intentional, do not "fix"): in this LEGACY registry the id
    // "executive" renders the legacy ./CreativeTemplate component, which was
    // rebranded "Executive" years ago (see TEMPLATE_INFO below — legacy id
    // "creative" maps here too via ID_MAP). Saved CVs persist these legacy ids,
    // so changing this mapping would silently change how existing documents
    // render. The modern "executive" design lives in ./templates/
    // ExecutiveTemplate and is resolved through the canonical registry.
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

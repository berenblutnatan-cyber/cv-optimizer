"use client";

import React from "react";
import { HarvardTemplate } from "./HarvardTemplate";
import { ModernTemplate } from "./ModernTemplate";
import { CreativeTemplate } from "./CreativeTemplate";

// Re-export individual templates for direct imports
export { HarvardTemplate } from "./HarvardTemplate";
export { ModernTemplate } from "./ModernTemplate";
export { CreativeTemplate } from "./CreativeTemplate";

// Template IDs
export type TemplateId = "ivy" | "modern" | "executive";

// Legacy type for backwards compatibility
export type TemplateType = "harvard" | "modern" | "creative";

// Template configuration interface
export interface TemplateConfig {
  component: React.ComponentType<{ data: string }>;
  name: string;
  description: string;
  preview: string;
}

/**
 * TEMPLATES - Main template registry
 */
export const TEMPLATES: Record<TemplateId, TemplateConfig> = {
  ivy: {
    component: HarvardTemplate,
    name: "The Ivy",
    description: "Classical serif design with black & white elegance. Ideal for legal, academic & executive roles.",
    preview: "/templates/ivy-preview.png",
  },
  modern: {
    component: ModernTemplate,
    name: "The Modern",
    description: "Clean sans-serif with emerald accents. Perfect for tech, business & startup roles.",
    preview: "/templates/modern-preview.png",
  },
  executive: {
    component: CreativeTemplate,
    name: "Executive",
    description: "Professional two-column layout with dark sidebar. Great for senior professionals & consultants.",
    preview: "/templates/executive-preview.png",
  },
};

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
export const TEMPLATE_COMPONENTS: Record<TemplateType, React.ComponentType<{ data: string }>> = {
  harvard: HarvardTemplate,
  modern: ModernTemplate,
  creative: CreativeTemplate,
};

/**
 * Get template by ID (supports both new and legacy IDs)
 */
export function getTemplate(id: TemplateId | TemplateType): TemplateConfig | undefined {
  const idMap: Record<string, TemplateId> = {
    harvard: "ivy",
    creative: "executive",
    ivy: "ivy",
    modern: "modern",
    executive: "executive",
  };
  const normalizedId = idMap[id] || id;
  return TEMPLATES[normalizedId as TemplateId];
}

/**
 * Get all template IDs
 */
export function getTemplateIds(): TemplateId[] {
  return Object.keys(TEMPLATES) as TemplateId[];
}

/**
 * Canonical CV template registry — the ONE source of truth for every template
 * list in the app.
 *
 * Before this file existed the same 18 templates were re-declared in six+
 * places (TemplateSwitcher, SmartResumePreview, cv-templates/index,
 * ThemeEngine, templatePresets, cvTools, template-lab) and they drifted:
 * different display names, different thumbnail gradients, and stale lists
 * missing the newest layouts. Every one of those consumers now derives its
 * list from here.
 *
 * RULES:
 * - NEVER change an `id` — ids are persisted in users' saved CVs and in the
 *   per-user premium-unlock localStorage. Add new ids; don't rename.
 * - This module must stay server-safe: pure data, no React, no imports from
 *   "use client" modules (lib/chat/cvTools runs it inside the chat API route).
 * - The id union must mirror `BuilderTemplateId` in context/BuilderContext
 *   (which we can't import here without dragging in a client module). The
 *   compile-time checks in TemplateSwitcher/templatePresets keep them in sync.
 */

/** Canonical template ids, in canonical display order. */
export const TEMPLATE_IDS = [
  "modern-sidebar",
  "ivy-league",
  "minimalist",
  "executive",
  "techie",
  "creative",
  "startup",
  "international",
  "aurora",
  "banner",
  "spotlight",
  "ledger",
  "devfolio",
  "canvas",
  "timeline",
  "double-column",
  "compact",
  "photo-left",
] as const;

export type TemplateRegistryId = (typeof TEMPLATE_IDS)[number];

/** Broad design category (used for switcher filtering + download cards). */
export type TemplateCategory = "professional" | "classic" | "creative" | "technical";

/** Gallery tab the template's presets appear under in TemplateGalleryModal. */
export type TemplateGalleryCategory =
  | "Professional"
  | "Modern"
  | "Creative"
  | "Classic"
  | "Technical"
  | "Simple"
  | "Executive";

/** Mirrors `keyof FONTS` in components/cv-templates/ThemeEngine.ts. */
export type TemplateFontKey = "serif" | "sans" | "clean" | "mono";

/** Mirrors TemplateMetadata["layout"] in ThemeEngine.ts. */
export type TemplateLayoutKind = "single" | "sidebar" | "split" | "header";

export interface TemplateRegistryEntry {
  id: TemplateRegistryId;
  /** The single display name for this design, everywhere in the product. */
  name: string;
  /** Short descriptor (switcher tiles, dropdowns). */
  description: string;
  /** Longer selling line (download cards). */
  detail: string;
  /** Gallery tagline (template gallery preset cards). */
  tagline: string;
  category: TemplateCategory;
  galleryCategory: TemplateGalleryCategory;
  /** Canonical CSS gradient used for every thumbnail of this design. */
  preview: string;
  /** Premium templates cost 1 credit to unlock per user. */
  premium: boolean;
  /** Newest layouts — flagged "NEW" and led in galleries. */
  isNew: boolean;
  fonts: TemplateFontKey;
  layout: TemplateLayoutKind;
  supportsPhoto: boolean;
}

export const TEMPLATE_REGISTRY: Record<TemplateRegistryId, TemplateRegistryEntry> = {
  "modern-sidebar": {
    id: "modern-sidebar",
    name: "Modern Sidebar",
    description: "Two-column with dark sidebar",
    detail: "Two-column with dark sidebar. Perfect for tech & business roles.",
    tagline: "Two-column layout with a bold sidebar — built for tech & business.",
    category: "professional",
    galleryCategory: "Professional",
    preview: "linear-gradient(135deg, #0f172a 35%, #ffffff 35%)",
    premium: true,
    isNew: false,
    fonts: "sans",
    layout: "sidebar",
    supportsPhoto: true,
  },
  "ivy-league": {
    id: "ivy-league",
    name: "Ivy League",
    description: "Classic serif elegance",
    detail: "Classic serif elegance. Ideal for legal, academic & executive roles.",
    tagline: "Timeless serif elegance that recruiters trust.",
    category: "classic",
    galleryCategory: "Classic",
    preview: "linear-gradient(180deg, #fafafa 0%, #f1f5f9 100%)",
    // The only free / default template. Everyone gets this without paying.
    premium: false,
    isNew: false,
    fonts: "serif",
    layout: "single",
    supportsPhoto: false,
  },
  minimalist: {
    id: "minimalist",
    name: "Minimalist",
    description: "Clean whitespace design",
    detail: "Clean whitespace design. Great for modern creative roles.",
    tagline: "Clean whitespace that lets your work speak.",
    category: "professional",
    galleryCategory: "Simple",
    preview: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    premium: true,
    isNew: false,
    fonts: "clean",
    layout: "single",
    supportsPhoto: false,
  },
  executive: {
    id: "executive",
    name: "Executive",
    description: "Bold dark header",
    detail: "Bold dark header for senior professionals & consultants.",
    tagline: "A commanding dark header for senior roles.",
    category: "professional",
    galleryCategory: "Executive",
    preview: "linear-gradient(180deg, #111827 30%, #ffffff 30%)",
    premium: true,
    isNew: false,
    fonts: "sans",
    layout: "header",
    supportsPhoto: true,
  },
  techie: {
    id: "techie",
    name: "Techie",
    description: "Developer-focused layout",
    detail: "Developer-focused with skills grid. Perfect for engineers.",
    tagline: "A skills-forward layout made for engineers.",
    category: "technical",
    galleryCategory: "Technical",
    preview: "linear-gradient(180deg, #1e293b 20%, #ffffff 20%)",
    premium: true,
    isNew: false,
    fonts: "mono",
    layout: "single",
    supportsPhoto: false,
  },
  creative: {
    id: "creative",
    name: "Creative",
    description: "Unique split design",
    detail: "Unique split design. Made for designers & marketers.",
    tagline: "A striking split design for design & marketing.",
    category: "creative",
    galleryCategory: "Creative",
    preview: "linear-gradient(135deg, #10b981 35%, #ffffff 35%)",
    premium: true,
    isNew: false,
    fonts: "sans",
    layout: "split",
    supportsPhoto: true,
  },
  startup: {
    id: "startup",
    name: "Startup",
    description: "Bold modern typography",
    detail: "Bold modern typography. Great for innovative companies.",
    tagline: "Punchy modern type for fast-moving teams.",
    category: "creative",
    galleryCategory: "Modern",
    preview: "linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)",
    premium: true,
    isNew: false,
    fonts: "sans",
    layout: "single",
    supportsPhoto: false,
  },
  international: {
    id: "international",
    name: "International",
    description: "Photo support, standardized",
    detail: "Photo support, standardized format. Common in Europe.",
    tagline: "Photo-ready and standardized — the European standard.",
    category: "professional",
    galleryCategory: "Professional",
    preview: "linear-gradient(135deg, #f1f5f9 30%, #ffffff 30%)",
    premium: true,
    isNew: false,
    fonts: "clean",
    layout: "sidebar",
    supportsPhoto: true,
  },
  aurora: {
    id: "aurora",
    name: "Aurora",
    description: "Accent rail, tinted header",
    detail: "Accent rail + tinted header. Colorful but clean for PM & business roles.",
    tagline: "Accent rail and a tinted header — colorful but clean.",
    category: "professional",
    galleryCategory: "Professional",
    preview: "linear-gradient(90deg, #6366f1 7%, #eef2ff 7%, #ffffff 60%)",
    premium: true,
    isNew: false,
    fonts: "sans",
    layout: "single",
    supportsPhoto: false,
  },
  banner: {
    id: "banner",
    name: "Banner",
    description: "Full-width color banner",
    detail: "Full-width color banner header. Confident and modern, still one page.",
    tagline: "A full-width color banner header — confident and modern.",
    category: "professional",
    galleryCategory: "Creative",
    preview: "linear-gradient(180deg, #4f46e5 28%, #ffffff 28%)",
    premium: true,
    isNew: false,
    fonts: "sans",
    layout: "header",
    supportsPhoto: false,
  },
  spotlight: {
    id: "spotlight",
    name: "Spotlight",
    description: "Centered, ATS-safe",
    detail: "Centered, airy and maximally ATS-safe. Great default for any role.",
    tagline: "Centered, airy and maximally ATS-safe.",
    category: "professional",
    galleryCategory: "Simple",
    preview: "linear-gradient(180deg, #ffffff 0%, #eef2ff 100%)",
    premium: true,
    isNew: false,
    fonts: "clean",
    layout: "single",
    supportsPhoto: false,
  },
  ledger: {
    id: "ledger",
    name: "Ledger",
    description: "Editorial serif, date rail",
    detail: "Editorial serif with a date rail. Elegant for finance, law & consulting.",
    tagline: "Editorial serif with a date rail — elegant for finance & law.",
    category: "classic",
    galleryCategory: "Classic",
    preview: "linear-gradient(180deg, #fbf6ec 0%, #f3ece0 100%)",
    premium: true,
    isNew: false,
    fonts: "serif",
    layout: "single",
    supportsPhoto: false,
  },
  devfolio: {
    id: "devfolio",
    name: "Devfolio",
    description: "Developer / mono style",
    detail: "Monospace README style with a skills grid. Built for developers.",
    tagline: "Monospace README style with a skills grid — built for developers.",
    category: "technical",
    galleryCategory: "Technical",
    preview: "linear-gradient(180deg, #0f172a 7%, #ffffff 7%)",
    premium: true,
    isNew: false,
    fonts: "mono",
    layout: "single",
    supportsPhoto: false,
  },
  canvas: {
    id: "canvas",
    name: "Canvas",
    description: "Creative accent sidebar",
    detail: "Bold accent sidebar with photo. Personality for designers & creatives.",
    tagline: "A bold accent sidebar with a photo — personality for creatives.",
    category: "creative",
    galleryCategory: "Creative",
    preview: "linear-gradient(120deg, #6366f1 34%, #ffffff 34%)",
    premium: true,
    isNew: false,
    fonts: "sans",
    layout: "sidebar",
    supportsPhoto: true,
  },
  timeline: {
    id: "timeline",
    name: "Timeline",
    description: "Vertical timeline rail",
    detail: "A vertical timeline rail that tells your career as a story.",
    tagline: "A vertical timeline that tells your career as a story.",
    category: "professional",
    galleryCategory: "Modern",
    preview: "linear-gradient(90deg, #6366f1 6%, #ffffff 6%)",
    premium: true,
    isNew: true,
    fonts: "sans",
    layout: "single",
    supportsPhoto: false,
  },
  "double-column": {
    id: "double-column",
    name: "Double Column",
    description: "Full header + two columns",
    detail: "Full header over two balanced light columns. Clean and compact.",
    tagline: "A full header over two balanced columns — clean and compact.",
    category: "professional",
    galleryCategory: "Professional",
    preview: "linear-gradient(90deg, #ffffff 60%, #f1f5f9 60%)",
    premium: true,
    isNew: true,
    fonts: "sans",
    layout: "split",
    supportsPhoto: false,
  },
  compact: {
    id: "compact",
    name: "Compact",
    description: "Dense, ATS-friendly",
    detail: "Dense, ATS-friendly single column. Fits more on one page.",
    tagline: "Dense and ATS-friendly — fits more on a single page.",
    category: "professional",
    galleryCategory: "Simple",
    preview: "linear-gradient(180deg, #6366f1 5%, #ffffff 5%)",
    premium: true,
    isNew: true,
    fonts: "sans",
    layout: "single",
    supportsPhoto: false,
  },
  "photo-left": {
    id: "photo-left",
    name: "Photo Left",
    description: "Photo rail + content",
    detail: "Photo rail with contact & skills beside your story.",
    tagline: "A photo rail with contact & skills beside your story.",
    category: "professional",
    galleryCategory: "Professional",
    preview: "linear-gradient(90deg, #e0e7ff 34%, #ffffff 34%)",
    premium: true,
    isNew: true,
    fonts: "sans",
    layout: "sidebar",
    supportsPhoto: true,
  },
};

/** All templates as an array, in canonical order. */
export const TEMPLATE_LIST: TemplateRegistryEntry[] = TEMPLATE_IDS.map(
  (id) => TEMPLATE_REGISTRY[id]
);

/** The only template usable without an unlock. */
export const DEFAULT_FREE_TEMPLATE_ID: TemplateRegistryId = "ivy-league";

/** Whether a template requires a credit unlock. Unknown ids are not premium. */
export function isPremiumTemplate(id: string): boolean {
  return TEMPLATE_REGISTRY[id as TemplateRegistryId]?.premium === true;
}

/** Look up a registry entry by (possibly unknown) id. */
export function getTemplateEntry(id: string): TemplateRegistryEntry | undefined {
  return TEMPLATE_REGISTRY[id as TemplateRegistryId];
}

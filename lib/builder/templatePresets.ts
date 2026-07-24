import type { BuilderTemplateId, ThemeColor } from "@/context/BuilderContext";
import {
  TEMPLATE_IDS,
  TEMPLATE_REGISTRY,
  isPremiumTemplate,
} from "@/lib/templates/registry";

/**
 * Template presets — the gallery behind the builder's "Templates" button.
 *
 * Enhancv-style: a curated set of base LAYOUTS, each re-themed across our
 * accent PALETTES and re-presented for different roles, so the gallery offers
 * 100 distinct, named, categorized starting points from 8 layouts × 10 colors.
 * Selecting a preset just sets {layout, color} on the live document.
 */

export type PresetCategory =
  | "Professional"
  | "Modern"
  | "Creative"
  | "Classic"
  | "Technical"
  | "Simple"
  | "Executive"
  | "By role";

export interface TemplatePreset {
  id: string;
  name: string;
  category: PresetCategory;
  layout: BuilderTemplateId;
  color: ThemeColor;
  tagline: string;
  premium: boolean;
  isNew: boolean;
}

// Family name / category / tagline now live in the canonical registry
// (lib/templates/registry.ts) — the gallery derives from it so a new template
// can never be missing here.

// Display name for each accent palette (the "edition").
const COLOR_NAMES: Record<ThemeColor, string> = {
  indigo: "Indigo",
  blue: "Azure",
  purple: "Plum",
  rose: "Rosé",
  amber: "Amber",
  slate: "Slate",
  navy: "Navy",
  violet: "Violet",
  orange: "Sunset",
  black: "Noir",
};

const COLOR_ORDER: ThemeColor[] = [
  "navy",
  "indigo",
  "blue",
  "slate",
  "black",
  "violet",
  "purple",
  "rose",
  "amber",
  "orange",
];

// Curated gallery order (featured layouts first). Any registry template NOT
// listed here is automatically appended below, so a newly-registered template
// can never silently miss the gallery.
const FEATURED_ORDER: BuilderTemplateId[] = [
  // New layouts (this release) lead the gallery.
  "double-column",
  "timeline",
  "photo-left",
  "compact",
  // The recent design drop.
  "aurora",
  "banner",
  "spotlight",
  "ledger",
  "devfolio",
  "canvas",
  // Established archetypes.
  "modern-sidebar",
  "ivy-league",
  "minimalist",
  "executive",
  "techie",
  "creative",
  "startup",
  "international",
];

const LAYOUT_ORDER: BuilderTemplateId[] = [
  ...FEATURED_ORDER,
  // Completeness guard: anything in the registry the curated list forgot.
  ...TEMPLATE_IDS.filter((id) => !FEATURED_ORDER.includes(id)),
];

// Presets: every layout in every palette.
const BASE_PRESETS: TemplatePreset[] = LAYOUT_ORDER.flatMap((layout) => {
  const meta = TEMPLATE_REGISTRY[layout];
  const premium = isPremiumTemplate(layout);
  return COLOR_ORDER.map((color) => ({
    id: `${layout}--${color}`,
    name: `${meta.name} · ${COLOR_NAMES[color]}`,
    category: meta.galleryCategory,
    layout,
    color,
    tagline: meta.tagline,
    premium,
    isNew: meta.isNew,
  }));
});

// 20 role-based "signature" picks — same layouts, framed for a target role,
// the way Enhancv re-lists base templates per industry.
const SIGNATURE: Array<{ name: string; layout: BuilderTemplateId; color: ThemeColor; tagline: string }> = [
  { name: "Software Engineer", layout: "techie", color: "slate", tagline: "Skills grid up top — ATS-friendly for engineering roles." },
  { name: "Product Manager", layout: "modern-sidebar", color: "indigo", tagline: "Impact-first layout for product & program roles." },
  { name: "Data Scientist", layout: "techie", color: "navy", tagline: "Lead with tooling, models and measurable outcomes." },
  { name: "UX / Product Designer", layout: "creative", color: "violet", tagline: "A confident header for portfolio-driven designers." },
  { name: "Graphic Designer", layout: "creative", color: "rose", tagline: "Expressive split layout for visual creatives." },
  { name: "Marketing Manager", layout: "startup", color: "orange", tagline: "Punchy and modern for growth & brand roles." },
  { name: "Finance & Analyst", layout: "ivy-league", color: "navy", tagline: "Conservative and precise for finance and analysis." },
  { name: "Management Consultant", layout: "executive", color: "black", tagline: "Boardroom-ready structure for consultants." },
  { name: "Sales Executive", layout: "executive", color: "blue", tagline: "Quota-and-results framing for sales leaders." },
  { name: "Operations Manager", layout: "modern-sidebar", color: "slate", tagline: "Process-and-metrics layout for operations." },
  { name: "Nurse & Healthcare", layout: "minimalist", color: "blue", tagline: "Clean, credential-forward for healthcare." },
  { name: "Teacher & Educator", layout: "ivy-league", color: "slate", tagline: "Warm, classic layout for education roles." },
  { name: "Legal & Attorney", layout: "ivy-league", color: "black", tagline: "Formal and restrained for legal professionals." },
  { name: "Academic & Researcher", layout: "ivy-league", color: "navy", tagline: "Publication-ready format for academia." },
  { name: "Student & Entry-Level", layout: "minimalist", color: "indigo", tagline: "Education-first layout for early careers." },
  { name: "Recent Graduate", layout: "minimalist", color: "violet", tagline: "Fresh and focused for new grads." },
  { name: "Startup Founder", layout: "startup", color: "black", tagline: "Bold founder energy for builders." },
  { name: "Project Manager", layout: "modern-sidebar", color: "blue", tagline: "Delivery-and-stakeholder layout for PMs." },
  { name: "Executive Leader", layout: "executive", color: "navy", tagline: "Authority and scale for VP/C-suite." },
  { name: "Career Switcher", layout: "minimalist", color: "amber", tagline: "Transferable-skills framing for a pivot." },
];

const SIGNATURE_PRESETS: TemplatePreset[] = SIGNATURE.map((s, i) => ({
  id: `role-${i}-${s.layout}`,
  name: s.name,
  category: "By role",
  layout: s.layout,
  color: s.color,
  tagline: s.tagline,
  premium: isPremiumTemplate(s.layout),
  isNew: TEMPLATE_REGISTRY[s.layout].isNew,
}));

export const TEMPLATE_PRESETS: TemplatePreset[] = [...BASE_PRESETS, ...SIGNATURE_PRESETS];

export const PRESET_CATEGORIES: ("All" | PresetCategory)[] = [
  "All",
  "Professional",
  "Modern",
  "Creative",
  "Classic",
  "Technical",
  "Simple",
  "Executive",
  "By role",
];

/** Count per category for the gallery tab badges. */
export function presetsByCategory(category: "All" | PresetCategory): TemplatePreset[] {
  if (category === "All") return TEMPLATE_PRESETS;
  return TEMPLATE_PRESETS.filter((p) => p.category === category);
}

import type { BuilderTemplateId, ThemeColor } from "@/context/BuilderContext";
import { isPremiumTemplate } from "@/components/cv-templates";

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

// Layouts added in the 2026-06 expansion — flagged "New" and led in the gallery.
const NEW_LAYOUTS = new Set<BuilderTemplateId>([
  "timeline",
  "double-column",
  "compact",
  "photo-left",
]);

type LayoutMeta = {
  family: string;
  category: PresetCategory;
  tagline: string;
};

const LAYOUTS: Record<BuilderTemplateId, LayoutMeta> = {
  "modern-sidebar": {
    family: "Modern Professional",
    category: "Professional",
    tagline: "Two-column layout with a bold sidebar — built for tech & business.",
  },
  "ivy-league": {
    family: "Ivy League",
    category: "Classic",
    tagline: "Timeless serif elegance that recruiters trust.",
  },
  minimalist: {
    family: "Minimalist",
    category: "Simple",
    tagline: "Clean whitespace that lets your work speak.",
  },
  executive: {
    family: "Executive",
    category: "Executive",
    tagline: "A commanding dark header for senior roles.",
  },
  techie: {
    family: "Techie",
    category: "Technical",
    tagline: "A skills-forward layout made for engineers.",
  },
  creative: {
    family: "Creative",
    category: "Creative",
    tagline: "A striking split design for design & marketing.",
  },
  startup: {
    family: "Startup",
    category: "Modern",
    tagline: "Punchy modern type for fast-moving teams.",
  },
  international: {
    family: "International",
    category: "Professional",
    tagline: "Photo-ready and standardized — the European standard.",
  },
  timeline: {
    family: "Timeline",
    category: "Modern",
    tagline: "A vertical timeline that tells your career as a story.",
  },
  "double-column": {
    family: "Double Column",
    category: "Professional",
    tagline: "A full header over two balanced columns — clean and compact.",
  },
  compact: {
    family: "Compact",
    category: "Simple",
    tagline: "Dense and ATS-friendly — fits more on a single page.",
  },
  "photo-left": {
    family: "Photo Left",
    category: "Professional",
    tagline: "A photo rail with contact & skills beside your story.",
  },
  banner: {
    family: "Banner",
    category: "Creative",
    tagline: "A full-width color banner header — confident and modern.",
  },
  aurora: {
    family: "Aurora",
    category: "Professional",
    tagline: "Accent rail and a tinted header — colorful but clean.",
  },
  spotlight: {
    family: "Spotlight",
    category: "Simple",
    tagline: "Centered, airy and maximally ATS-safe.",
  },
  ledger: {
    family: "Ledger",
    category: "Classic",
    tagline: "Editorial serif with a date rail — elegant for finance & law.",
  },
  devfolio: {
    family: "Devfolio",
    category: "Technical",
    tagline: "Monospace README style with a skills grid — built for developers.",
  },
  canvas: {
    family: "Canvas",
    category: "Creative",
    tagline: "A bold accent sidebar with a photo — personality for creatives.",
  },
};

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

const LAYOUT_ORDER: BuilderTemplateId[] = [
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

// 80 presets: every layout in every palette.
const BASE_PRESETS: TemplatePreset[] = LAYOUT_ORDER.flatMap((layout) => {
  const meta = LAYOUTS[layout];
  const premium = isPremiumTemplate(layout);
  return COLOR_ORDER.map((color) => ({
    id: `${layout}--${color}`,
    name: `${meta.family} · ${COLOR_NAMES[color]}`,
    category: meta.category,
    layout,
    color,
    tagline: meta.tagline,
    premium,
    isNew: NEW_LAYOUTS.has(layout),
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
  isNew: NEW_LAYOUTS.has(s.layout),
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

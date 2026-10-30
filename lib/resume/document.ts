// The v2 CV document.
//
// `content` is the engine's ResumeData shape, kept on purpose: the 18
// templates, the optimizer pipeline, the grounding verifier and the persona
// evals all read it, so it stays the one content model. The document adds what
// a v1 row kept elsewhere or not at all: the design (it used to live only in a
// client store, so versions and exports weren't reproducible), locale and
// direction. Every change goes through applyDocumentOp, which is pure and runs
// identically on the client (instant preview) and the server (authoritative).

import type { ResumeData } from "@/types/resume";
import { applyCvToolCall, sanitizeDesign, DESIGN_COLORS, DESIGN_TEMPLATES } from "@/lib/chat/cvTools";
import { isPlaceholderSummary } from "@/lib/chat/prompts";

export const SCHEMA_VERSION = 2 as const;

export type DesignColor = (typeof DESIGN_COLORS)[number];
export type DesignTemplate = (typeof DESIGN_TEMPLATES)[number];

export type DesignState = {
  template: DesignTemplate;
  accentColor: DesignColor;
  fontLevel: number;
  spacingLevel: number;
  autoFit: boolean;
  pageMode: "one" | "multi";
};

export type ResumeDocument = {
  schemaVersion: typeof SCHEMA_VERSION;
  locale: string;
  direction: "ltr" | "rtl";
  content: ResumeData;
  design: DesignState;
};

export const DEFAULT_DESIGN: DesignState = {
  template: "minimalist",
  accentColor: "slate",
  fontLevel: 5,
  spacingLevel: 5,
  autoFit: true,
  pageMode: "one",
};

export function emptyContent(): ResumeData {
  return {
    personalInfo: { name: "", email: "", phone: "", linkedin: "", website: "", location: "", title: "" },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: [],
    customSections: [],
  };
}

export function emptyDocument(overrides: Partial<Pick<ResumeDocument, "locale" | "direction">> = {}): ResumeDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    locale: overrides.locale ?? "en",
    direction: overrides.direction ?? "ltr",
    content: emptyContent(),
    design: { ...DEFAULT_DESIGN },
  };
}

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Backstop for any stored or client-sent content: every array the reducer
 * touches exists, every personal field is a string, and the old wizard's
 * template-filler summary ("Results-driven professional with [X]…") is
 * treated as empty so it can never reach a preview or an export.
 */
export function normalizeContent(raw: unknown): ResumeData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<ResumeData> & Record<string, unknown>;
  const pi = (r.personalInfo && typeof r.personalInfo === "object" ? r.personalInfo : {}) as Record<string, unknown>;
  const summary = str(r.summary);
  return {
    personalInfo: {
      name: str(pi.name),
      email: str(pi.email),
      phone: str(pi.phone),
      linkedin: str(pi.linkedin),
      website: str(pi.website),
      location: str(pi.location),
      title: str(pi.title),
      ...(typeof pi.photo === "string" && pi.photo ? { photo: pi.photo } : {}),
    },
    summary: isPlaceholderSummary(summary) ? "" : summary,
    experience: arr<ResumeData["experience"][number]>(r.experience).map((e) => ({ ...e, description: arr<string>(e.description) })),
    education: arr<ResumeData["education"][number]>(r.education).map((e) => ({ ...e, achievements: arr<string>(e.achievements) })),
    skills: arr<string>(r.skills).filter((s) => typeof s === "string"),
    projects: arr<ResumeData["projects"][number]>(r.projects).map((p) => ({ ...p, technologies: arr<string>(p.technologies), bullets: arr<string>(p.bullets) })),
    certifications: arr<ResumeData["certifications"][number]>(r.certifications),
    languages: arr<string>(r.languages).filter((s) => typeof s === "string"),
    customSections: arr<ResumeData["customSections"][number]>(r.customSections).map((c) => ({ ...c, items: arr(c.items) })),
  };
}

function normalizeDesign(raw: unknown, legacy?: { template?: string | null; themeColor?: string | null }): DesignState {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const patch = sanitizeDesign({
    template: d.template ?? legacy?.template ?? undefined,
    accentColor: d.accentColor ?? legacy?.themeColor ?? undefined,
    fontLevel: d.fontLevel,
    spacingLevel: d.spacingLevel,
    autoFit: d.autoFit,
  });
  return {
    ...DEFAULT_DESIGN,
    ...(patch ?? {}),
    pageMode: d.pageMode === "multi" ? "multi" : "one",
  };
}

/** Read whatever is stored in Resume.data (v1 ResumeData or a v2 document) as a v2 document. */
export function toDocument(
  stored: unknown,
  legacy?: { template?: string | null; themeColor?: string | null },
): ResumeDocument {
  const s = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  if (s.schemaVersion === SCHEMA_VERSION) {
    return {
      schemaVersion: SCHEMA_VERSION,
      locale: str(s.locale) || "en",
      direction: s.direction === "rtl" ? "rtl" : "ltr",
      content: normalizeContent(s.content),
      design: normalizeDesign(s.design, legacy),
    };
  }
  // v1 row: Resume.data was the bare ResumeData; template/color lived in columns.
  return {
    schemaVersion: SCHEMA_VERSION,
    locale: "en",
    direction: "ltr",
    content: normalizeContent(s),
    design: normalizeDesign(undefined, legacy),
  };
}

/**
 * Apply one operation to a document. `set_design` changes the design; every
 * other name goes through the content reducer. Returns the SAME reference
 * when nothing changed, so callers can detect no-ops with `===`.
 */
export function applyDocumentOp(doc: ResumeDocument, name: string, input: Record<string, unknown>): ResumeDocument {
  if (name === "set_design") {
    const patch = sanitizeDesign(input);
    const pageMode = input.pageMode === "multi" || input.pageMode === "one" ? input.pageMode : undefined;
    if (!patch && !pageMode) return doc;
    const next: DesignState = { ...doc.design, ...(patch ?? {}), ...(pageMode ? { pageMode } : {}) };
    // A manual size choice turns auto-fit off (the auto-fit engine would undo it).
    if (patch && (patch.fontLevel !== undefined || patch.spacingLevel !== undefined) && patch.autoFit === undefined && input.fromAutoFit !== true) {
      next.autoFit = false;
    }
    const same = (Object.keys(next) as (keyof DesignState)[]).every((k) => next[k] === doc.design[k]);
    return same ? doc : { ...doc, design: next };
  }
  if (name === "insert_entry") {
    const content = insertEntry(doc.content, input);
    return content === doc.content ? doc : { ...doc, content };
  }
  const content = applyCvToolCall(doc.content, name, input);
  return content === doc.content ? doc : { ...doc, content };
}

type EntrySection = "experience" | "education" | "projects" | "certifications" | "customSections";
const ENTRY_SECTIONS: readonly EntrySection[] = ["experience", "education", "projects", "certifications", "customSections"];

/** Coerce a client-sent entry into the section's exact shape (no stray fields reach storage). */
function shapeEntry(section: EntrySection, raw: Record<string, unknown>, id: string) {
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  switch (section) {
    case "experience":
      return { id, company: str(raw.company), role: str(raw.role), location: str(raw.location), startDate: str(raw.startDate), endDate: str(raw.endDate), current: raw.current === true, description: strs(raw.description) };
    case "education":
      return { id, institution: str(raw.institution), degree: str(raw.degree), field: str(raw.field), location: str(raw.location), startDate: str(raw.startDate), endDate: str(raw.endDate), ...(str(raw.gpa) ? { gpa: str(raw.gpa) } : {}), achievements: strs(raw.achievements) };
    case "projects":
      return { id, name: str(raw.name), description: str(raw.description), technologies: strs(raw.technologies), ...(str(raw.link) ? { link: str(raw.link) } : {}), bullets: strs(raw.bullets) };
    case "certifications":
      return { id, name: str(raw.name), issuer: str(raw.issuer), date: str(raw.date), ...(str(raw.link) ? { link: str(raw.link) } : {}) };
    case "customSections": {
      const items = Array.isArray(raw.items) ? raw.items : [];
      return {
        id,
        title: str(raw.title),
        items: items
          .map((it, k) => (it && typeof it === "object" ? { id: str((it as Record<string, unknown>).id) || `${id}-i${k}`, text: str((it as Record<string, unknown>).text) } : null))
          .filter((x): x is { id: string; text: string } => !!x),
      };
    }
  }
}

/**
 * Editor-only: insert a whole entry (with its id) at a position. Used for
 * "Add role" (a blank entry the user then fills) and to undo a delete exactly
 * where it was. Inserting an id that already exists is a no-op (idempotent).
 */
function insertEntry(c: ResumeData, input: Record<string, unknown>): ResumeData {
  const section = input.section as EntrySection;
  if (!ENTRY_SECTIONS.includes(section)) return c;
  const raw = input.entry && typeof input.entry === "object" ? (input.entry as Record<string, unknown>) : null;
  const id = raw && typeof raw.id === "string" ? raw.id.trim() : "";
  if (!raw || !/^[A-Za-z0-9_-]{6,64}$/.test(id)) return c;
  const list = c[section] as { id: string }[];
  if (list.some((e) => e.id === id)) return c;
  const at = Number.isInteger(input.index) ? Math.max(0, Math.min(list.length, input.index as number)) : list.length;
  const next = list.slice();
  next.splice(at, 0, shapeEntry(section, raw, id));
  return { ...c, [section]: next } as ResumeData;
}

/** Short human title for lists and the browser tab. */
export function documentTitle(doc: ResumeDocument): string {
  const { name, title } = doc.content.personalInfo;
  if (name && title) return `${name} — ${title}`;
  return name || title || "Untitled CV";
}

/** How much of a usable CV exists, for the completeness checklist. */
export type CompletenessItem = { key: string; label: string; done: boolean };

export function completeness(c: ResumeData): CompletenessItem[] {
  const bullets = c.experience.reduce((n, e) => n + e.description.filter((b) => b.trim()).length, 0);
  return [
    { key: "name", label: "Name and title", done: !!c.personalInfo.name.trim() && !!c.personalInfo.title.trim() },
    { key: "contact", label: "Email or phone", done: !!c.personalInfo.email.trim() || !!c.personalInfo.phone.trim() },
    { key: "experience", label: "One role", done: c.experience.length > 0 },
    { key: "bullets", label: "Three achievements", done: bullets >= 3 },
    { key: "education", label: "Education", done: c.education.length > 0 },
    { key: "skills", label: "Six skills", done: c.skills.filter((s) => s.trim()).length >= 6 },
    { key: "summary", label: "Summary", done: c.summary.trim().length >= 40 },
  ];
}

// Which section each index-addressed tool targets.
const TOOL_SECTION: Record<string, keyof Pick<ResumeData, "experience" | "education" | "projects" | "certifications" | "customSections">> = {
  update_experience: "experience",
  update_experience_bullet: "experience",
  remove_experience: "experience",
  update_education: "education",
  remove_education: "education",
  update_project: "projects",
  remove_project: "projects",
  update_certification: "certifications",
  remove_certification: "certifications",
  update_custom_section: "customSections",
  remove_custom_section: "customSections",
};

/**
 * The model addresses entries by zero-based index (that's what its prompt
 * snapshot shows). Before an op is logged, pin the index to the entry's id as
 * it was in the document the model saw, so replaying the op later — after a
 * concurrent typed edit added or removed an entry — still hits the same entry.
 */
export function pinTarget(doc: ResumeDocument, name: string, input: Record<string, unknown>): Record<string, unknown> {
  const section = TOOL_SECTION[name];
  if (!section || typeof input.id === "string") return input;
  const i = Number(input.index);
  const entry = Number.isInteger(i) ? (doc.content[section] as { id: string }[])[i] : undefined;
  if (!entry) return input;
  const { index: _index, ...rest } = input;
  return { ...rest, id: entry.id };
}

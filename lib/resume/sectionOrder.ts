import type { ResumeData } from "@/types/resume";

// The order of a CV's body sections, one list for every place that lays them
// out: the templates (via toTemplateData), plain-text export and the editor.
// Keys are the template section ids: the four built-ins, then each custom
// section by its own id. Summary, skills and languages are placed by each
// template's design, so they are not in this list.

export const BUILTIN_SECTIONS = ["experience", "education", "projects", "certifications"] as const;

/** Every body section the CV has, in its order: stored order first, then anything new in default order. */
export function sectionKeys(c: Pick<ResumeData, "customSections" | "sectionOrder">): string[] {
  const present = [...BUILTIN_SECTIONS, ...c.customSections.map((s) => s.id)];
  const has = new Set(present);
  const out: string[] = [];
  for (const k of c.sectionOrder ?? []) if (has.has(k) && !out.includes(k)) out.push(k);
  for (const k of present) if (!out.includes(k)) out.push(k);
  return out;
}

/** Sort anything keyed by section id into the CV's order. */
export function inSectionOrder<T extends { id: string }>(c: Pick<ResumeData, "customSections" | "sectionOrder">, items: T[]): T[] {
  const rank = new Map(sectionKeys(c).map((k, i) => [k, i]));
  return items.slice().sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9));
}

/** Move one key a step up or down; returns the new full order (unchanged at the ends). */
export function moveSection(c: Pick<ResumeData, "customSections" | "sectionOrder">, key: string, direction: "up" | "down"): string[] {
  const keys = sectionKeys(c);
  const from = keys.indexOf(key);
  const to = from + (direction === "up" ? -1 : 1);
  if (from === -1 || to < 0 || to >= keys.length) return keys;
  const next = keys.slice();
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

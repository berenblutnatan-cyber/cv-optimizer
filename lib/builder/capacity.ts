// Content-size estimate vs template capacity — pure, DOM-free, server-safe.
//
// Powers fit heuristics where no DOM exists (the chat agent's template
// advice, server-side reasoning). The DOM solver (lib/builder/autofit.ts) is
// always the ground truth; this is the coarse predictor.

import type { ResumeData } from "@/types/resume";
import { TEMPLATE_REGISTRY, type TemplateRegistryId } from "@/lib/templates/registry";

const SECTION_OVERHEAD_LINES = 2; // heading + breathing room
const ENTRY_HEADER_LINES = 2; // role/company/date rows

function textLines(text: string, charsPerLine: number): number {
  const t = text.trim();
  if (!t) return 0;
  return Math.max(1, Math.ceil(t.length / charsPerLine));
}

/** Approximate body lines this CV occupies in the given template's main column. */
export function estimateLines(data: ResumeData, templateId: TemplateRegistryId): number {
  const { charsPerLine } = TEMPLATE_REGISTRY[templateId].capacity;
  let lines = 4; // name + contact header
  if (data.summary.trim()) lines += SECTION_OVERHEAD_LINES + textLines(data.summary, charsPerLine);
  if (data.experience.length > 0) {
    lines += SECTION_OVERHEAD_LINES;
    for (const exp of data.experience) {
      lines += ENTRY_HEADER_LINES;
      for (const b of exp.description) lines += textLines(b, charsPerLine);
    }
  }
  if (data.education.length > 0) {
    lines += SECTION_OVERHEAD_LINES + data.education.length * 2;
    for (const edu of data.education) lines += edu.achievements.filter((a) => a.trim()).length;
  }
  if (data.skills.length > 0) lines += SECTION_OVERHEAD_LINES + Math.ceil(data.skills.join(", ").length / charsPerLine);
  if (data.projects.length > 0) {
    lines += SECTION_OVERHEAD_LINES;
    for (const p of data.projects) {
      lines += 1 + textLines(p.description, charsPerLine);
      for (const b of p.bullets) lines += textLines(b, charsPerLine);
    }
  }
  if (data.certifications.length > 0) lines += SECTION_OVERHEAD_LINES + data.certifications.length;
  if (data.languages.length > 0) lines += SECTION_OVERHEAD_LINES + 1;
  for (const cs of data.customSections) {
    if (cs.items.length > 0) {
      lines += SECTION_OVERHEAD_LINES;
      for (const item of cs.items) lines += textLines(item.text, charsPerLine);
    }
  }
  return lines;
}

/** ≤1: comfortably one page; >1: expect overflow at default density. */
export function estimateFitRatio(data: ResumeData, templateId: TemplateRegistryId): number {
  return estimateLines(data, templateId) / TEMPLATE_REGISTRY[templateId].capacity.linesAtDefault;
}

/** Templates ranked by estimated headroom for this CV (best fit first). */
export function rankTemplatesByFit(data: ResumeData): Array<{ id: TemplateRegistryId; ratio: number }> {
  return (Object.keys(TEMPLATE_REGISTRY) as TemplateRegistryId[])
    .map((id) => ({ id, ratio: estimateFitRatio(data, id) }))
    .sort((a, b) => a.ratio - b.ratio);
}

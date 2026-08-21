// Pure helpers linking section critiques to the suggestions that fix them.
//
// GroundedSuggestion.section is a free-form human label — unreliable. The
// patch is structural: tool name + zero-based index. Match on that; fall back
// to a label fuzzy-match for patchless (advice-only) suggestions.

import type { ResumeData } from "@/types/resume";
import type { GroundedSuggestion, SectionCritique } from "./types";

const TOOL_SECTION: Record<string, SectionCritique["section"]> = {
  update_summary: "summary",
  set_skills: "skills",
  set_languages: "skills",
  update_education: "education",
  update_project: "projects",
  update_experience: "experience",
  update_experience_bullet: "experience",
};

/** Suggestions that address a given critique (non-dismissed filtering is the
 *  caller's job — this is pure matching). */
export function suggestionsForCritique(
  critique: SectionCritique,
  suggestions: GroundedSuggestion[],
  resumeData: ResumeData | null
): GroundedSuggestion[] {
  if (critique.section === "overall") return [];
  return suggestions.filter((s) => {
    if (s.patch) {
      const target = TOOL_SECTION[s.patch.name];
      if (target !== critique.section) return false;
      if (critique.section !== "experience") return true;
      const idx = Number((s.patch.input as { index?: unknown }).index);
      return Number.isInteger(idx) && idx === critique.experienceIndex;
    }
    // Patchless (advice-only): fuzzy label match.
    const label = (s.section || "").toLowerCase();
    if (critique.section === "experience") {
      const exp =
        typeof critique.experienceIndex === "number" && resumeData
          ? resumeData.experience[critique.experienceIndex]
          : null;
      if (!exp) return false;
      return (
        (exp.company && label.includes(exp.company.toLowerCase())) ||
        (exp.role && label.includes(exp.role.toLowerCase()))
      );
    }
    return label.includes(critique.section);
  });
}

/** Human header for a critique card ("Experience — PM at Taboola"). */
export function critiqueSectionLabel(
  critique: SectionCritique,
  resumeData: ResumeData | null
): string {
  if (critique.section !== "experience" || typeof critique.experienceIndex !== "number") {
    return critique.section.charAt(0).toUpperCase() + critique.section.slice(1);
  }
  const exp = resumeData?.experience[critique.experienceIndex];
  if (!exp) return "Experience";
  const role = exp.role || "";
  const company = exp.company || "";
  if (role && company) return `${role} · ${company}`;
  return role || company || "Experience";
}

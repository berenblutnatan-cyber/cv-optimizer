// Inline AI assist — the action catalog + the PURE mapper from an AI suggestion
// to a CV mutation. Keeping the array-merge logic here (one trusted place) means
// the endpoint only has to return raw text/items; the client assembles the final
// applyCvToolCall input and runs it through the same deterministic reducer the
// chat builder uses.

import type { ResumeData } from "@/types/resume";
import type { CvToolName } from "@/lib/chat/cvTools";

export type AssistAction =
  | "write_summary"
  | "improve_summary"
  | "improve_bullets"
  | "quantify_bullets"
  | "generate_bullets"
  | "suggest_headline"
  | "suggest_skills";

export type AssistTarget = {
  /** The current value being acted on (e.g. the summary text to improve). */
  text?: string;
  expIndex?: number;
  role?: string;
  company?: string;
  existingBullets?: string[];
  currentTitle?: string;
  currentSkills?: string[];
  currentSummary?: string;
  jd?: string;
};

// What the AI emits — one of these is filled depending on the action.
export type AssistSuggestion = { text?: string; items?: string[] };

export const ASSIST_LABEL: Record<AssistAction, string> = {
  write_summary: "Write summary",
  improve_summary: "Improve summary",
  improve_bullets: "Improve bullets",
  quantify_bullets: "Add metrics",
  generate_bullets: "Generate bullets",
  suggest_headline: "Suggest headline",
  suggest_skills: "Suggest skills",
};

const ALL: AssistAction[] = [
  "write_summary",
  "improve_summary",
  "improve_bullets",
  "quantify_bullets",
  "generate_bullets",
  "suggest_headline",
  "suggest_skills",
];

export function isAssistAction(v: unknown): v is AssistAction {
  return typeof v === "string" && (ALL as string[]).includes(v);
}

/**
 * Assemble the final `applyCvToolCall(tool, input)` from a suggestion + target +
 * the current CV. Returns null when the suggestion is empty or the target is
 * out of range (the caller then no-ops). Pure & unit-testable.
 */
export function buildAssistInput(
  action: AssistAction,
  suggestion: AssistSuggestion,
  target: AssistTarget,
  cv: ResumeData
): { tool: CvToolName; input: Record<string, unknown> } | null {
  const text = suggestion.text?.trim();
  const items = (suggestion.items ?? []).map((s) => String(s).trim()).filter(Boolean);

  switch (action) {
    case "write_summary":
    case "improve_summary": {
      if (!text) return null;
      return { tool: "update_summary", input: { summary: text } };
    }
    case "suggest_headline": {
      if (!text) return null;
      return { tool: "update_personal_info", input: { title: text } };
    }
    case "improve_bullets":
    case "quantify_bullets": {
      // Replace the whole description array for one role (v1 = per-entry).
      const ei = target.expIndex;
      if (ei == null || !cv.experience[ei] || items.length === 0) return null;
      return { tool: "update_experience", input: { index: ei, description: items } };
    }
    case "generate_bullets": {
      // Append new bullets to the role's existing ones.
      const ei = target.expIndex;
      if (ei == null || !cv.experience[ei] || items.length === 0) return null;
      const existing = cv.experience[ei].description.filter((b) => b.trim());
      return { tool: "update_experience", input: { index: ei, description: [...existing, ...items] } };
    }
    case "suggest_skills": {
      if (items.length === 0) return null;
      // The reducer dedups + caps at 40, so pass current + suggested.
      return { tool: "set_skills", input: { skills: [...cv.skills, ...items] } };
    }
    default:
      return null;
  }
}

// Cover-letter expertise. Source skill: cover-letter-generator (the 5-hook
// library + bans — the rest duplicated what lib/coverLetterPrompt.ts already
// does well).

import type { Seniority, Track } from "../types";

export const COVER_LETTER_HOOKS = `OPENING HOOK — pick the ONE type the inputs best support (never open with "I am writing to apply", "I saw your posting", or any sentence starting with "I"):
1. Company knowledge: a specific recent product/launch/decision of theirs + why your experience connects.
2. Mutual connection: name + shared context (only if provided — never invent one).
3. Problem-solver: quote the JD's stated challenge and point at the exact time you solved it.
4. Achievement: your single most relevant, quantified win, tied to their context.
5. Industry insight: a specific observation about their market inflection + your position in it.
BODY 1 FORMULA: [Their stated need] + [Your exact matching experience] + [Specific result].
BODY 2: second strength OR honest gap handling ("X is developing — here's the adjacent strength that compensates"). Never apologize.
CLOSE: specific contribution + clear ask. Ban: "I look forward to hearing from you", "Please find my resume attached", "available at your convenience".`;

export function coverLetterToneLine(track: Track, seniority: Seniority | null | undefined): string {
  const bySeniority =
    seniority === "lead" || seniority === "senior"
      ? "Write at the level of scope the person operates at (teams, budgets, strategy), not task detail."
      : seniority === "entry"
        ? "Confidence from projects and trajectory, not inflated claims; enthusiasm is an asset at this level."
        : "";
  const byTrack =
    track === "tech"
      ? "Concrete systems and scale beat adjectives; one named technology per proof point."
      : track === "executive"
        ? "Business outcomes and transformation narrative; P&L/scope in the first body paragraph."
        : track === "creative"
          ? "Reference the portfolio early; one line on a shipped piece of work with its outcome."
          : track === "academic"
            ? "Research fit and scholarly record; name the group/department, not just the institution."
            : "";
  return [byTrack, bySeniority].filter(Boolean).join(" ");
}

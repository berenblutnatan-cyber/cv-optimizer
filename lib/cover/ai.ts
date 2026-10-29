import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { structured, type Schema } from "@/lib/ai/structured";
import { snapshotForPrompt } from "@/lib/chat/cvTools";
import { inventedNumbers } from "@/lib/grounding/numbers";
import { detectTrack, knowledgeFor } from "@/lib/knowledge";
import type { ResumeData } from "@/types/resume";

// A cover letter from one CV for one job. Grounded like the rest of v2: every
// claim comes from the CV, every fact about the company from the job post.
// Numbers on neither are caught by lib/grounding/numbers; one rewrite removes
// them, and anything left is returned as flags for the user to check.

export const LETTER_MODEL = "claude-opus-5-5";

const SYSTEM = `You write cover letters that get interviews, from the candidate's real CV only.
Rules that override everything else:
- Every claim about the candidate comes from the CV. Never invent a number, employer, title, tool, or result.
- Every fact about the company comes from the job post text. No outside research, no "recent launches" or news you can't see in the post. If the post says little about the company, open with the problem the role solves or the candidate's most relevant result instead.
- 220 to 320 words. Three or four short paragraphs. First person, plain words, specific.
- No clichés: not "passionate", "team player", "hard-working", "fast-paced", "leverage", "synergy", "I believe I would be a great fit", "I am writing to apply", "I look forward to hearing from you".
- Don't open a paragraph with "I".`;

const SCHEMA: Schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    greeting: { type: "string", description: 'e.g. "Dear Globex hiring team," (use a name only if the post gives one).' },
    paragraphs: { type: "array", items: { type: "string" }, description: "3 or 4 paragraphs, in order." },
    signoff: { type: "string", description: 'e.g. "Best regards," — without the name.' },
  },
  required: ["greeting", "paragraphs", "signoff"],
};

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function compose(out: Record<string, unknown>, name: string): string {
  const paragraphs = (Array.isArray(out.paragraphs) ? out.paragraphs : []).map(s).filter(Boolean).slice(0, 5);
  if (paragraphs.length < 2) throw new Error("letter too short");
  return [s(out.greeting) || "Dear hiring team,", ...paragraphs, [s(out.signoff) || "Best regards,", name].filter(Boolean).join("\n")].join("\n\n");
}

export type LetterInput = { content: ResumeData; jd: string; jobTitle: string; company: string };

/** The texts a letter may draw facts from (also used to re-check an edited letter). */
export function letterSources(p: Pick<LetterInput, "content" | "jd">): string[] {
  return [snapshotForPrompt(p.content), p.jd];
}

export async function writeCoverLetter(anthropic: Anthropic, p: LetterInput): Promise<{ body: string; flags: string[] }> {
  const hooks = knowledgeFor({ surface: "coverLetter", track: detectTrack(p.jobTitle, p.jd), seniority: null });
  const user = `JOB${p.company ? ` at ${p.company}` : ""}${p.jobTitle ? `: ${p.jobTitle}` : ""}
"""
${p.jd.slice(0, 10000)}
"""

CANDIDATE CV:
${snapshotForPrompt(p.content).slice(0, 10000)}

${hooks}`;
  const name = p.content.personalInfo?.name?.trim() ?? "";
  const first = await structured(anthropic, { model: LETTER_MODEL, maxTokens: 8000, effort: "medium", system: SYSTEM, schema: SCHEMA, user });
  let body = compose(first, name);
  const sources = letterSources(p);
  let flags = inventedNumbers(body, sources);
  if (flags.length > 0) {
    // One rewrite without the figures nobody can back up.
    const again = await structured(anthropic, {
      model: LETTER_MODEL,
      maxTokens: 8000,
      effort: "medium",
      system: SYSTEM,
      schema: SCHEMA,
      user: `${user}\n\nYOUR DRAFT:\n${body}\n\nThese figures are on neither the CV nor the job post: ${flags.join(", ")}. Rewrite the letter without them. Keep everything else that is true.`,
    });
    body = compose(again, name);
    flags = inventedNumbers(body, sources);
  }
  return { body: body.slice(0, 20000), flags };
}

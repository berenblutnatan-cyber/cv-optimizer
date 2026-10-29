import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { snapshotForPrompt } from "@/lib/chat/cvTools";
import { INTERVIEW_STANDARDS } from "@/lib/knowledge/blocks/interview";
import type { DeepAnalysis } from "@/lib/optimizer/types";
import type { ResumeData } from "@/types/resume";
import { groundAddToCv } from "./ground";
import { INTERVIEW, type AnswerFeedback, type InterviewAnswer, type InterviewQuestion, type InterviewReport } from "./types";

// The two model calls of interview practice. Both return JSON constrained to a
// schema (structured outputs), then validated and clamped here, never trusted
// raw. The 5.5 models reject forced tool_choice, so this is the supported path.

export const QUESTION_MODEL = "claude-sonnet-5-5";
export const SCORING_MODEL = "claude-opus-5-5";

type Effort = "low" | "medium" | "high";
type Schema = Record<string, unknown>;

// The installed SDK predates `output_config.format` and `fallbacks`; the API
// accepts them, so the params are sent through the beta endpoint as-is.
async function structured(
  anthropic: Anthropic,
  p: {
    model: string;
    maxTokens: number;
    effort: Effort;
    system: string;
    schema: Schema;
    user: string;
  },
): Promise<Record<string, unknown>> {
  const params = {
    model: p.model,
    max_tokens: p.maxTokens,
    system: p.system,
    thinking: { type: "adaptive" },
    output_config: {
      effort: p.effort,
      format: { type: "json_schema", schema: p.schema },
    },
    // A policy decline is re-run on a fallback model inside the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [{ role: "user", content: p.user }],
  };
  const r = (await anthropic.beta.messages.create(params as unknown as Parameters<typeof anthropic.beta.messages.create>[0])) as {
    stop_reason: string | null;
    content: { type: string; text?: string }[];
  };
  if (r.stop_reason === "max_tokens") throw new Error("model output was cut off");
  if (r.stop_reason === "refusal") throw new Error("model declined the request");
  const text = r.content
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("");
  try {
    const out = JSON.parse(text) as unknown;
    if (out && typeof out === "object" && !Array.isArray(out)) return out as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new Error("no structured output");
}

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const sa = (v: unknown, max = 6) => (Array.isArray(v) ? v.map(s).filter(Boolean).slice(0, max) : []);

/** The weakest spots tailoring found, so practice lands where the job will push. */
function gapsFrom(analysis: DeepAnalysis | null): string {
  if (!analysis) return "";
  const req = new Map(analysis.jdRequirements.map((r) => [r.id, r]));
  const gaps = analysis.coverage
    .filter((c) => c.status !== "strong")
    .map((c) => `- ${req.get(c.requirementId)?.text ?? c.requirementId} (${c.status}${c.note ? `: ${c.note}` : ""})`)
    .slice(0, 8);
  return gaps.length ? `\n\nWHERE THIS CV IS THIN FOR THIS JOB (from a fit check):\n${gaps.join("\n")}` : "";
}

const QUESTIONS_SCHEMA: Schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      description: "The interview questions, in the order they will be asked.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: {
            type: "string",
            description: "Exactly what the interviewer says. One question, spoken naturally, under 40 words.",
          },
          kind: { type: "string", enum: ["opener", "behavioral", "role"] },
          focus: {
            type: "string",
            description: "The requirement or gap this probes, 2-6 words.",
          },
        },
        required: ["text", "kind", "focus"],
      },
    },
  },
  required: ["questions"],
};

export async function generateQuestions(
  anthropic: Anthropic,
  p: {
    content: ResumeData;
    jd: string;
    jobTitle: string;
    company: string;
    analysis: DeepAnalysis | null;
  },
): Promise<InterviewQuestion[]> {
  const out = await structured(anthropic, {
    model: QUESTION_MODEL,
    maxTokens: 8000,
    effort: "medium",
    system:
      "You are a seasoned hiring manager preparing a realistic first-round interview. Questions are about this candidate and this job, never generic. Ground every question in the job and the candidate's real CV; never assume experience they don't list.",
    schema: QUESTIONS_SCHEMA,
    user: `JOB${p.company ? ` at ${p.company}` : ""}${p.jobTitle ? `: ${p.jobTitle}` : ""}
"""
${p.jd.slice(0, 8000)}
"""

CANDIDATE CV:
${snapshotForPrompt(p.content).slice(0, 8000)}${gapsFrom(p.analysis)}

Write exactly ${INTERVIEW.questions} questions:
1. One short opener ("walk me through…" style, tied to this job).
2. Then the questions this job's interviewer would really ask, weighted toward the thin spots above: at least two behavioral (STAR), at least one testing a named requirement.

${INTERVIEW_STANDARDS}`,
  });
  const qs = (Array.isArray(out.questions) ? out.questions : [])
    .map((q): InterviewQuestion | null => {
      const o = (q ?? {}) as Record<string, unknown>;
      const text = s(o.text);
      if (text.length < 10) return null;
      const kind = s(o.kind);
      return {
        text: text.slice(0, 400),
        kind: kind === "opener" || kind === "role" ? kind : "behavioral",
        focus: s(o.focus).slice(0, 80),
      };
    })
    .filter((q): q is InterviewQuestion => q !== null)
    .slice(0, INTERVIEW.questions);
  if (qs.length < 3) throw new Error("too few questions");
  return qs;
}

const SCORE_SCHEMA: Schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    overall: {
      type: "integer",
      description: "0-100: how this interview would land with this job's hiring manager.",
    },
    summary: {
      type: "string",
      description: "Two sentences: the strongest thing and the one fix that matters most. Plain words.",
    },
    answers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          index: { type: "integer" },
          score: { type: "integer", description: "0-10" },
          worked: {
            type: "array",
            items: { type: "string" },
            description: "1-3 specific things that landed.",
          },
          missing: {
            type: "array",
            items: { type: "string" },
            description: "1-3 specific gaps (a result, a number, their own role, relevance to the job).",
          },
          stronger: {
            type: "string",
            description: "The same answer, rewritten stronger, using ONLY facts they said or that are on the CV. Spoken length, first person.",
          },
          addToCv: {
            description: "Only when they said a concrete achievement that is NOT on their CV yet. null otherwise.",
            anyOf: [
              { type: "null" },
              {
                type: "object",
                additionalProperties: false,
                properties: {
                  experienceIndex: {
                    type: "integer",
                    description: "Zero-based index of the CV role it belongs to.",
                  },
                  bullet: {
                    type: "string",
                    description: "A CV bullet: action verb, what, result. Only their facts.",
                  },
                  quote: {
                    type: "string",
                    description: "Their exact words that state it, copied from the answer.",
                  },
                },
                required: ["experienceIndex", "bullet", "quote"],
              },
            ],
          },
        },
        required: ["index", "score", "worked", "missing", "stronger", "addToCv"],
      },
    },
  },
  required: ["overall", "summary", "answers"],
};

export async function scoreInterview(
  anthropic: Anthropic,
  p: {
    content: ResumeData;
    jd: string;
    jobTitle: string;
    questions: InterviewQuestion[];
    answers: InterviewAnswer[];
  },
): Promise<InterviewReport> {
  const qa = p.questions
    .map((q, i) => {
      const a = p.answers.find((x) => x.index === i);
      return `Q${i} [${q.kind}; probes: ${q.focus}]: ${q.text}\nA${i}: ${a ? a.text : "(not answered)"}`;
    })
    .join("\n\n");
  const out = await structured(anthropic, {
    model: SCORING_MODEL,
    maxTokens: 16000,
    effort: "high",
    system:
      "You are an exacting but kind interview coach. Judge each answer against what this job needs. Be specific, never generic. Never invent facts: a stronger answer and any CV bullet may use only what the candidate said or what is on their CV. Unanswered questions score 0 with one line on what to prepare.",
    schema: SCORE_SCHEMA,
    user: `JOB${p.jobTitle ? `: ${p.jobTitle}` : ""}
"""
${p.jd.slice(0, 6000)}
"""

CV (indices are zero-based):
${snapshotForPrompt(p.content).slice(0, 7000)}

INTERVIEW:
${qa}

${INTERVIEW_STANDARDS}`,
  });

  const clampInt = (v: unknown, lo: number, hi: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
  };
  const answered = new Set(p.answers.map((a) => a.index));
  const answers: AnswerFeedback[] = p.questions.map((_, i) => {
    const raw = ((Array.isArray(out.answers) ? out.answers : []) as Record<string, unknown>[]).find((a) => Number(a?.index) === i) ?? {};
    const add = (raw.addToCv ?? null) as Record<string, unknown> | null;
    const fb: AnswerFeedback = {
      index: i,
      // An unanswered question is a 0, whatever the model said.
      score: answered.has(i) ? clampInt(raw.score, 0, 10) : 0,
      worked: answered.has(i) ? sa(raw.worked, 3) : [],
      missing: sa(raw.missing, 3),
      stronger: s(raw.stronger).slice(0, 2000),
      addToCv:
        add && answered.has(i)
          ? {
              experienceIndex: clampInt(add.experienceIndex, 0, 99),
              company: "",
              role: "",
              bullet: s(add.bullet).slice(0, 300),
              quote: s(add.quote).slice(0, 400),
            }
          : null,
    };
    return groundAddToCv(fb, p.answers, p.content.experience);
  });
  return {
    overall: clampInt(out.overall, 0, 100),
    summary: s(out.summary).slice(0, 600),
    answers,
  };
}

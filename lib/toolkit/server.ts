import "server-only";

// Career toolkit — SERVER registry: rate caps, prompt builders (fed by the
// knowledge layer), forced-tool schemas, and output normalizers. The route
// (app/api/toolkit/[tool]) is a thin shell over this.

import type Anthropic from "@anthropic-ai/sdk";
import { detectTrack, knowledgeFor, type Surface } from "@/lib/knowledge";
import type { ToolId } from "./tools";

const str = { type: "string" as const };
const strArr = { type: "array" as const, items: { type: "string" as const } };

export type ToolInputs = Record<string, string>;

export type ServerTool = {
  id: ToolId;
  hourlyCap: number;
  maxTokens: number;
  surface: Surface;
  /** Returns an error message, or null when inputs are valid. */
  validate(inputs: ToolInputs): string | null;
  buildPrompt(inputs: ToolInputs, knowledge: string): { system: string; user: string };
  emitTool: Anthropic.Tool;
  /** Coerce the tool_use input into the response payload (null = unusable). */
  normalize(input: Record<string, unknown>): Record<string, unknown> | null;
};

// Input caps: CV/JD-sized fields 30k, everything else 2k.
const BIG_FIELDS = new Set(["cvText", "jobDescription"]);
export function capInputs(raw: unknown): ToolInputs {
  const out: ToolInputs = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>).slice(0, 20)) {
    if (typeof value !== "string") continue;
    out[key.slice(0, 40)] = value.slice(0, BIG_FIELDS.has(key) ? 30_000 : 2_000);
  }
  return out;
}

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const sa = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];

const HUMAN_SYSTEM =
  "You are an expert career coach. Ground EVERYTHING in the candidate's real material — never invent employers, projects, metrics, dates, or skills they didn't provide. Sound like a sharp human, never a template.";

function cvBlock(inputs: ToolInputs): string {
  return inputs.cvText ? `\n\nCANDIDATE CV:\n"""\n${inputs.cvText}\n"""` : "";
}
function jdBlock(inputs: ToolInputs): string {
  return inputs.jobDescription ? `\n\nJOB DESCRIPTION:\n"""\n${inputs.jobDescription}\n"""` : "";
}

export const SERVER_TOOLS: Record<ToolId, ServerTool> = {
  "cold-email": {
    id: "cold-email",
    hourlyCap: 10,
    maxTokens: 1200,
    surface: "coldEmail",
    validate: (i) => (s(i.cvText).length < 40 ? "Add your CV first." : null),
    buildPrompt: (i, knowledge) => ({
      system: HUMAN_SYSTEM,
      user: `Write a cold outreach email from this candidate${i.recipientName ? ` to ${i.recipientName}` : ""}${
        i.recipientRole ? ` (${i.recipientRole})` : ""
      }${i.companyName ? ` at ${i.companyName}` : ""}${i.jobTitle ? ` about the ${i.jobTitle} role` : ""}.${cvBlock(i)}${jdBlock(i)}

STANDARDS:
${knowledge}

Use the candidate's real name from the CV for the subject and sign-off.`,
    }),
    emitTool: {
      name: "emit_cold_email",
      description: "Return the cold email.",
      input_schema: {
        type: "object",
        properties: { subject: str, body: str },
        required: ["subject", "body"],
      },
    },
    normalize: (input) => {
      const subject = s(input.subject);
      const body = s(input.body);
      return subject && body ? { subject, body } : null;
    },
  },

  "application-answers": {
    id: "application-answers",
    hourlyCap: 15,
    maxTokens: 900,
    surface: "applicationAnswers",
    validate: (i) =>
      s(i.cvText).length < 40 ? "Add your CV first." : s(i.question).length < 5 ? "Paste the question." : null,
    buildPrompt: (i, knowledge) => ({
      system: HUMAN_SYSTEM,
      user: `Answer this application-form question as the candidate${
        i.maxWords ? ` in at most ${i.maxWords} words` : ""
      }:

QUESTION: ${i.question}${cvBlock(i)}${jdBlock(i)}

STANDARDS:
${knowledge}`,
    }),
    emitTool: {
      name: "emit_answer",
      description: "Return the answer.",
      input_schema: { type: "object", properties: { answer: str }, required: ["answer"] },
    },
    normalize: (input) => {
      const answer = s(input.answer);
      return answer ? { answer } : null;
    },
  },

  linkedin: {
    id: "linkedin",
    hourlyCap: 10,
    maxTokens: 1600,
    surface: "linkedin",
    validate: (i) => (s(i.cvText).length < 40 ? "Add your CV first." : null),
    buildPrompt: (i, knowledge) => ({
      system: HUMAN_SYSTEM,
      user: `Optimize this candidate's LinkedIn profile${i.targetRole ? ` for a ${i.targetRole} target` : ""}: 3 headline options, an About section, and the skills they should list.${cvBlock(i)}

STANDARDS:
${knowledge}`,
    }),
    emitTool: {
      name: "emit_linkedin",
      description: "Return the LinkedIn profile content.",
      input_schema: {
        type: "object",
        properties: { headlines: strArr, about: str, skills: strArr },
        required: ["headlines", "about"],
      },
    },
    normalize: (input) => {
      const headlines = sa(input.headlines).slice(0, 3);
      const about = s(input.about);
      if (headlines.length === 0 || !about) return null;
      return { headlines, about, skills: sa(input.skills).slice(0, 25) };
    },
  },

  references: {
    id: "references",
    hourlyCap: 6,
    maxTokens: 1600,
    surface: "references",
    validate: (i) => (s(i.referencesText).length < 5 ? "List at least one reference." : null),
    buildPrompt: (i, knowledge) => ({
      system: HUMAN_SYSTEM,
      user: `Prepare this candidate's references${i.jobTitle ? ` for a ${i.jobTitle} application` : ""}${
        i.companyName ? ` at ${i.companyName}` : ""
      }: a permission-ask message, a briefing email (sent once they say yes), and the formatted reference list.

THEIR REFERENCES (one per line — name, relationship, company):
${i.referencesText}${cvBlock(i)}

STANDARDS:
${knowledge}

Leave [brackets] for contact details the candidate must fill in — never invent phone numbers or emails.`,
    }),
    emitTool: {
      name: "emit_references",
      description: "Return the reference pack.",
      input_schema: {
        type: "object",
        properties: { permissionEmail: str, briefingEmail: str, formattedList: str },
        required: ["permissionEmail", "briefingEmail", "formattedList"],
      },
    },
    normalize: (input) => {
      const permissionEmail = s(input.permissionEmail);
      const briefingEmail = s(input.briefingEmail);
      const formattedList = s(input.formattedList);
      return permissionEmail && briefingEmail && formattedList
        ? { permissionEmail, briefingEmail, formattedList }
        : null;
    },
  },

  "salary-prep": {
    id: "salary-prep",
    hourlyCap: 6,
    maxTokens: 1800,
    surface: "salaryPrep",
    validate: (i) =>
      s(i.jobTitle).length < 2 ? "Add the role." : s(i.offerDetails).length < 5 ? "Describe the offer." : null,
    buildPrompt: (i, knowledge) => ({
      system: HUMAN_SYSTEM,
      user: `Prepare this candidate to negotiate a ${i.jobTitle} offer.

THE OFFER:
${i.offerDetails}${i.targetBase ? `\n\nTHEIR TARGET: ${i.targetBase}` : ""}${cvBlock(i)}

Produce: a counter script (their words, ready to say/send), a total-comp checklist (what to value and ask about in THIS offer), and talking points anchored in their real record.

STANDARDS:
${knowledge}`,
    }),
    emitTool: {
      name: "emit_salary_prep",
      description: "Return the negotiation pack.",
      input_schema: {
        type: "object",
        properties: { counterScript: str, totalCompChecklist: strArr, talkingPoints: strArr },
        required: ["counterScript", "totalCompChecklist", "talkingPoints"],
      },
    },
    normalize: (input) => {
      const counterScript = s(input.counterScript);
      const totalCompChecklist = sa(input.totalCompChecklist).slice(0, 12);
      const talkingPoints = sa(input.talkingPoints).slice(0, 8);
      return counterScript && totalCompChecklist.length > 0
        ? { counterScript, totalCompChecklist, talkingPoints }
        : null;
    },
  },

  "offer-comparison": {
    id: "offer-comparison",
    hourlyCap: 6,
    maxTokens: 2000,
    surface: "offerCompare",
    validate: (i) =>
      s(i.offerA).length < 5 || s(i.offerB).length < 5 ? "Describe both offers." : null,
    buildPrompt: (i, knowledge) => ({
      system: HUMAN_SYSTEM,
      user: `Compare these two offers with a weighted decision matrix and a recommendation.

OFFER A:
${i.offerA}

OFFER B:
${i.offerB}${i.priorities ? `\n\nTHE CANDIDATE'S PRIORITIES: ${i.priorities}` : ""}

STANDARDS:
${knowledge}

Score only from the details given; where a factor is unknown, say so in the recommendation instead of guessing.`,
    }),
    emitTool: {
      name: "emit_offer_comparison",
      description: "Return the comparison.",
      input_schema: {
        type: "object",
        properties: {
          matrix: {
            type: "array",
            items: {
              type: "object",
              properties: {
                factor: str,
                weight: { type: "number" },
                a: { type: "number" },
                b: { type: "number" },
                edge: { type: "string", enum: ["A", "B", "tie"] },
              },
              required: ["factor", "weight", "a", "b", "edge"],
            },
          },
          recommendation: str,
        },
        required: ["matrix", "recommendation"],
      },
    },
    normalize: (input) => {
      const matrix = (Array.isArray(input.matrix) ? input.matrix : [])
        .map((row) => {
          const o = (row ?? {}) as Record<string, unknown>;
          const factor = s(o.factor);
          const weight = Number(o.weight);
          const a = Number(o.a);
          const b = Number(o.b);
          const edge = o.edge === "A" || o.edge === "B" || o.edge === "tie" ? o.edge : "tie";
          if (!factor || !Number.isFinite(weight) || !Number.isFinite(a) || !Number.isFinite(b)) return null;
          return { factor, weight, a, b, edge };
        })
        .filter(Boolean);
      const recommendation = s(input.recommendation);
      return matrix.length > 0 && recommendation ? { matrix, recommendation } : null;
    },
  },

  "case-study": {
    id: "case-study",
    hourlyCap: 6,
    maxTokens: 2500,
    surface: "caseStudy",
    validate: (i) => (s(i.achievement).length < 10 ? "Describe the achievement." : null),
    buildPrompt: (i, knowledge) => ({
      system: HUMAN_SYSTEM,
      user: `Turn this achievement into a portfolio case study (markdown).

THE ACHIEVEMENT:
${i.achievement}${i.role ? `\n\nTHEIR ROLE: ${i.role}` : ""}${cvBlock(i)}

STANDARDS:
${knowledge}

Where a number is missing, leave a [bracketed placeholder] the candidate fills in — never invent metrics.`,
    }),
    emitTool: {
      name: "emit_case_study",
      description: "Return the case study.",
      input_schema: { type: "object", properties: { caseStudy: str }, required: ["caseStudy"] },
    },
    normalize: (input) => {
      const caseStudy = s(input.caseStudy);
      return caseStudy ? { caseStudy } : null;
    },
  },
};

/** Compose the knowledge block for a tool call. */
export function toolKnowledge(tool: ServerTool, inputs: ToolInputs): string {
  return knowledgeFor({
    surface: tool.surface,
    track: detectTrack(inputs.jobTitle || inputs.targetRole || inputs.role || "", inputs.jobDescription),
  });
}

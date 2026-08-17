// Pass 0: cvText → structured ResumeData via a forced-tool Sonnet call.
//
// Verbatim extraction only — the model copies text, never rewrites it. The
// result anchors everything downstream (evidence quotes, suggestion patches,
// the live preview on the results page), so fidelity beats polish here.

import type Anthropic from "@anthropic-ai/sdk";
import { generateId, type ResumeData } from "@/types/resume";

export const PARSE_MODEL = "claude-sonnet-4-6";

const str = { type: "string" as const };
const strArr = { type: "array" as const, items: { type: "string" as const } };

export const EMIT_RESUME_TOOL = {
  name: "emit_resume",
  description: "Return the CV parsed into structured fields, copied verbatim.",
  input_schema: {
    type: "object" as const,
    properties: {
      personalInfo: {
        type: "object" as const,
        properties: {
          name: str,
          email: str,
          phone: str,
          linkedin: str,
          website: str,
          location: str,
          title: { ...str, description: "Professional headline if stated near the name" },
        },
      },
      summary: { ...str, description: "The professional summary/profile paragraph, verbatim. Empty if none." },
      experience: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            company: str,
            role: str,
            location: str,
            startDate: str,
            endDate: { ...str, description: '"Present" if current' },
            current: { type: "boolean" as const },
            description: { ...strArr, description: "The entry's bullet points, each verbatim" },
          },
          required: ["company", "role"],
        },
      },
      education: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            institution: str,
            degree: str,
            field: str,
            location: str,
            startDate: str,
            endDate: str,
            gpa: str,
            achievements: { ...strArr, description: "Honors, coursework, thesis — verbatim" },
          },
          required: ["institution"],
        },
      },
      skills: strArr,
      languages: strArr,
      projects: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            name: str,
            description: str,
            technologies: strArr,
            link: str,
            bullets: strArr,
          },
          required: ["name"],
        },
      },
      certifications: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: { name: str, issuer: str, date: str },
          required: ["name"],
        },
      },
      customSections: {
        type: "array" as const,
        description: "Sections that don't fit above (Military Service, Volunteering, Awards, Publications…)",
        items: {
          type: "object" as const,
          properties: { title: str, items: strArr },
          required: ["title", "items"],
        },
      },
    },
    required: ["personalInfo", "summary", "experience", "education", "skills"],
  },
};

const PARSE_SYSTEM_PROMPT =
  "You are a CV parser. Extract the resume into structured fields, copying every piece of text VERBATIM — never rewrite, summarize, translate, or improve anything. Preserve contact details, URLs, dates, GPAs, and honors exactly as written. Every job/role is its own experience entry (never merge several roles into one). Respond ONLY via the emit_resume tool.";

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const sa = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];

/** Coerce the tool output into a well-formed ResumeData with generated ids. */
function toResumeData(input: Record<string, unknown>): ResumeData {
  const pi = (input.personalInfo ?? {}) as Record<string, unknown>;
  return {
    personalInfo: {
      name: s(pi.name),
      email: s(pi.email),
      phone: s(pi.phone),
      linkedin: s(pi.linkedin),
      website: s(pi.website),
      location: s(pi.location),
      title: s(pi.title),
    },
    summary: s(input.summary),
    experience: (Array.isArray(input.experience) ? input.experience : []).map((e) => {
      const o = (e ?? {}) as Record<string, unknown>;
      const current = o.current === true || /present/i.test(s(o.endDate));
      return {
        id: generateId(),
        company: s(o.company),
        role: s(o.role),
        location: s(o.location),
        startDate: s(o.startDate),
        endDate: current ? "Present" : s(o.endDate),
        current,
        description: sa(o.description),
      };
    }).filter((e) => e.company || e.role),
    education: (Array.isArray(input.education) ? input.education : []).map((e) => {
      const o = (e ?? {}) as Record<string, unknown>;
      return {
        id: generateId(),
        institution: s(o.institution),
        degree: s(o.degree),
        field: s(o.field),
        location: s(o.location),
        startDate: s(o.startDate),
        endDate: s(o.endDate),
        gpa: s(o.gpa) || undefined,
        achievements: sa(o.achievements),
      };
    }).filter((e) => e.institution),
    skills: sa(input.skills).slice(0, 40),
    languages: sa(input.languages).slice(0, 12),
    projects: (Array.isArray(input.projects) ? input.projects : []).map((p) => {
      const o = (p ?? {}) as Record<string, unknown>;
      return {
        id: generateId(),
        name: s(o.name),
        description: s(o.description),
        technologies: sa(o.technologies),
        link: s(o.link) || undefined,
        bullets: sa(o.bullets),
      };
    }).filter((p) => p.name),
    certifications: (Array.isArray(input.certifications) ? input.certifications : []).map((c) => {
      const o = (c ?? {}) as Record<string, unknown>;
      return { id: generateId(), name: s(o.name), issuer: s(o.issuer), date: s(o.date) };
    }).filter((c) => c.name),
    customSections: (Array.isArray(input.customSections) ? input.customSections : []).map((cs) => {
      const o = (cs ?? {}) as Record<string, unknown>;
      return {
        id: generateId(),
        title: s(o.title),
        items: sa(o.items).map((text) => ({ id: generateId(), text })),
      };
    }).filter((cs) => cs.title && cs.items.length > 0),
  };
}

export type ParseCvResult = {
  resumeData: ResumeData;
  /** True when the parse produced no usable structure — downstream must run
   *  in quote-anchored advice mode instead of failing the whole analysis. */
  degraded: boolean;
};

export async function parseCvText(anthropic: Anthropic, cvText: string): Promise<ParseCvResult> {
  const response = await anthropic.messages.create({
    model: PARSE_MODEL,
    max_tokens: 16000,
    system: PARSE_SYSTEM_PROMPT,
    tools: [EMIT_RESUME_TOOL],
    tool_choice: { type: "tool", name: "emit_resume" },
    messages: [{ role: "user", content: `Parse this CV:\n\n${cvText.slice(0, 30000)}` }],
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use" || response.stop_reason === "max_tokens") {
    return { resumeData: toResumeData({}), degraded: true };
  }

  const resumeData = toResumeData(toolUse.input as Record<string, unknown>);
  const degraded =
    resumeData.experience.length === 0 &&
    !resumeData.summary &&
    resumeData.skills.length === 0 &&
    resumeData.education.length === 0;
  return { resumeData, degraded };
}

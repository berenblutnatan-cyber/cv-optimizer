// Pass 0: cvText → structured ResumeData via a forced-tool Sonnet call.
//
// Verbatim extraction only — the model copies text, never rewrites it. The
// result anchors everything downstream (evidence quotes, suggestion patches,
// the live preview on the results page), so fidelity beats polish here.

import type Anthropic from "@anthropic-ai/sdk";
import { generateId, TITLED_SECTIONS, type ResumeData, type SectionTitles, type TitledSection } from "@/types/resume";
import { BUILTIN_SECTIONS } from "@/lib/resume/sectionOrder";
import { collapseLetterSpacing } from "@/lib/text/letterSpacing";

export const PARSE_MODEL = "claude-sonnet-4-6";

const str = { type: "string" as const };
const strArr = { type: "array" as const, items: { type: "string" as const } };

export const EMIT_RESUME_TOOL = {
  name: "emit_resume",
  description: "Return the CV parsed into structured fields, copied verbatim.",
  input_schema: {
    type: "object" as const,
    properties: {
      sections: {
        type: "array" as const,
        description:
          "Every section heading printed in the CV, in the order they appear, each copied exactly as written (\"Work History\", \"About me\", \"ניסיון תעסוקתי\"). Only headings that are actually printed: a section with no heading above it (often the summary) gets no entry. kind says what the section holds; custom for anything else (it must match a customSections title).",
        items: {
          type: "object" as const,
          properties: {
            kind: { type: "string" as const, enum: ["summary", "experience", "education", "skills", "languages", "projects", "certifications", "custom"] },
            title: str,
          },
          required: ["kind", "title"],
        },
      },
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
/** A heading as written, minus the letter-spacing a PDF or a paste turns into spaces. */
const heading = (v: unknown): string => collapseLetterSpacing(s(v));
const sa = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];

/** Coerce the tool output into a well-formed ResumeData with generated ids.
 *  Also safe on a PARTIAL tool input (a streaming snapshot). */
export function toResumeData(input: Record<string, unknown>): ResumeData {
  const pi = (input.personalInfo ?? {}) as Record<string, unknown>;
  return withLayout(input.sections, {
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
        title: heading(o.title),
        items: sa(o.items).map((text) => ({ id: generateId(), text })),
      };
    }).filter((cs) => cs.title && cs.items.length > 0),
  });
}

const sameTitle = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/**
 * Keep the CV's own structure: its section order, and its headings as it wrote
 * them. A heading the CV didn't write stays absent, so the template's words show.
 */
export function withLayout(rawSections: unknown, data: ResumeData): ResumeData {
  const list = (Array.isArray(rawSections) ? rawSections : [])
    .map((x) => (x ?? {}) as Record<string, unknown>)
    .map((x) => ({ kind: s(x.kind), title: heading(x.title).slice(0, 80) }))
    .filter((x) => x.title);
  if (!list.length) return data;
  // One printed heading belongs to one section. A heading claimed twice is a
  // guess for one of them (a summary with no heading of its own gets the
  // next one's), so neither keeps it and the template's words show.
  const claims = new Map<string, Set<string>>();
  for (const { kind, title } of list) claims.set(title.toLocaleLowerCase(), (claims.get(title.toLocaleLowerCase()) ?? new Set()).add(kind));
  const ambiguous = (title: string) => (claims.get(title.toLocaleLowerCase())?.size ?? 0) > 1;
  const titles: SectionTitles = {};
  const order: string[] = [];
  for (const { kind, title } of list) {
    if ((TITLED_SECTIONS as readonly string[]).includes(kind)) {
      if (!ambiguous(title)) titles[kind as TitledSection] ??= title;
      if ((BUILTIN_SECTIONS as readonly string[]).includes(kind) && !order.includes(kind)) order.push(kind);
    } else {
      const custom = data.customSections.find((c) => sameTitle(c.title, title));
      if (custom && !order.includes(custom.id)) order.push(custom.id);
    }
  }
  return {
    ...data,
    ...(order.length ? { sectionOrder: order } : {}),
    ...(Object.keys(titles).length ? { sectionTitles: titles } : {}),
  };
}

export type ParseCvResult = {
  resumeData: ResumeData;
  /** True when the parse produced no usable structure — downstream must run
   *  in quote-anchored advice mode instead of failing the whole analysis. */
  degraded: boolean;
};

function parseRequest(cvText: string) {
  return {
    model: PARSE_MODEL,
    max_tokens: 16000,
    system: PARSE_SYSTEM_PROMPT,
    tools: [EMIT_RESUME_TOOL],
    tool_choice: { type: "tool" as const, name: "emit_resume" },
    messages: [{ role: "user" as const, content: `Parse this CV:\n\n${cvText.slice(0, 30000)}` }],
  };
}

function finish(response: Anthropic.Message): ParseCvResult {
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

export async function parseCvText(anthropic: Anthropic, cvText: string): Promise<ParseCvResult> {
  return finish(await anthropic.messages.create(parseRequest(cvText)));
}

/**
 * Same parse, streamed: `onPartial` receives the CV as far as the model has
 * written it (a coerced snapshot of the partial tool input), so a caller can
 * render sections as they arrive. The final result is identical to parseCvText.
 */
export async function parseCvTextStreaming(
  anthropic: Anthropic,
  cvText: string,
  onPartial: (partial: ResumeData) => void,
  opts: { signal?: AbortSignal; intervalMs?: number } = {},
): Promise<ParseCvResult> {
  const stream = anthropic.messages.stream(parseRequest(cvText), { signal: opts.signal });
  const interval = opts.intervalMs ?? 250;
  let last = 0;
  stream.on("inputJson", (_delta, snapshot) => {
    const now = Date.now();
    if (now - last < interval || !snapshot || typeof snapshot !== "object") return;
    last = now;
    onPartial(toResumeData(snapshot as Record<string, unknown>));
  });
  return finish(await stream.finalMessage());
}

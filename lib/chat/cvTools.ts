// Tool layer for the chat-first CV builder.
//
// One source of truth for three things:
//   1. CV_TOOLS          — Anthropic tool schemas the agent can call
//   2. applyCvToolCall   — pure reducer (ResumeData, call) -> ResumeData,
//                          run on the server (authoritative) AND on the
//                          client (instant preview) with identical results
//   3. describeToolCall  — short human label rendered as a chip in the thread
//
// Index-based targeting: the system prompt embeds the current CV snapshot
// with explicit zero-based indices, so update/remove tools take an `index`
// rather than internal ids.

import type { ResumeData, Experience, Education, Project } from "@/types/resume";
import { generateId } from "@/types/resume";
import { TEMPLATE_IDS } from "@/lib/templates/registry";

export type CvToolName =
  | "update_personal_info"
  | "update_summary"
  | "add_experience"
  | "update_experience"
  | "remove_experience"
  | "add_education"
  | "update_education"
  | "remove_education"
  | "set_skills"
  | "set_languages"
  | "add_project"
  | "update_project"
  | "remove_project"
  | "add_certification"
  | "remove_certification"
  | "add_custom_section"
  | "remove_custom_section"
  | "rewrite_bullet"
  | "remove_bullet"
  | "insert_bullet"
  | "set_design";

/**
 * Sections whose entries hold a list of bullet lines. The bullet tools address
 * ONE line inside one entry — the granularity the review engine needs to say
 * "cut this bullet" without rewriting the whole entry.
 */
export type BulletSection = "experience" | "projects" | "education" | "customSections";

const BULLET_SECTION_ALIASES: Record<string, BulletSection> = {
  experience: "experience",
  experiences: "experience",
  work: "experience",
  projects: "projects",
  project: "projects",
  education: "education",
  custom: "customSections",
  customsections: "customSections",
  custom_sections: "customSections",
  section: "customSections",
};

/** Map a model-supplied section name onto a real section, or null. */
export function normalizeBulletSection(v: unknown): BulletSection | null {
  const raw = typeof v === "string" ? v.trim().toLowerCase() : "";
  return BULLET_SECTION_ALIASES[raw] ?? null;
}

// Design targets the agent can set via set_design. Derived from the canonical
// template registry (lib/templates/registry.ts — pure data, server-safe, no
// "use client" imports) so the chat agent can never drift from the builder's
// template list. Must mirror BuilderTemplateId / ThemeColor.
export const DESIGN_TEMPLATES = TEMPLATE_IDS;

export const DESIGN_COLORS = [
  "indigo",
  "blue",
  "purple",
  "rose",
  "amber",
  "slate",
  "navy",
  "violet",
  "orange",
  "black",
] as const;

export type DesignPatchValidated = {
  template?: (typeof DESIGN_TEMPLATES)[number];
  accentColor?: (typeof DESIGN_COLORS)[number];
  fontLevel?: number;
  spacingLevel?: number;
};

/**
 * Validate a set_design tool call into a safe design patch. Returns null when
 * nothing usable was provided, so a confused model can never push a broken
 * template id or an out-of-range slider. Design lives OUTSIDE ResumeData
 * (it's client view state), so it's applied via a dedicated "design" SSE
 * event rather than the applyCvToolCall reducer.
 */
export function sanitizeDesign(input: Record<string, unknown>): DesignPatchValidated | null {
  const out: DesignPatchValidated = {};
  const tmpl = s(input.template);
  if (tmpl && (DESIGN_TEMPLATES as readonly string[]).includes(tmpl)) {
    out.template = tmpl as (typeof DESIGN_TEMPLATES)[number];
  }
  const color = s(input.accentColor);
  if (color && (DESIGN_COLORS as readonly string[]).includes(color)) {
    out.accentColor = color as (typeof DESIGN_COLORS)[number];
  }
  const clampLevel = (v: unknown): number | undefined => {
    const n = Number(v);
    if (!Number.isFinite(n)) return undefined;
    return Math.min(10, Math.max(1, Math.round(n)));
  };
  const font = clampLevel(input.fontLevel);
  if (font !== undefined) out.fontLevel = font;
  const spacing = clampLevel(input.spacingLevel);
  if (spacing !== undefined) out.spacingLevel = spacing;
  return Object.keys(out).length > 0 ? out : null;
}

export type CvToolCall = { name: CvToolName; input: Record<string, unknown> };

const str = { type: "string" as const };
const strArr = { type: "array" as const, items: { type: "string" as const } };

// Anthropic Messages API tool definitions. Descriptions are written for the
// model: terse, imperative, with the one rule that matters most — never
// invent facts the user didn't give.
export const CV_TOOLS = [
  {
    name: "update_personal_info",
    description:
      "Set or update contact/header fields. Only include fields the user actually provided.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: str,
        email: str,
        phone: str,
        linkedin: str,
        website: str,
        location: { ...str, description: "City, Country — e.g. 'Tel Aviv, Israel'" },
        title: { ...str, description: "Professional headline, e.g. 'Senior Product Manager'" },
      },
    },
  },
  {
    name: "update_summary",
    description:
      "Write or rewrite the professional summary (2-4 sentences, grounded ONLY in facts the user shared).",
    input_schema: {
      type: "object" as const,
      properties: { summary: str },
      required: ["summary"],
    },
  },
  {
    name: "add_experience",
    description:
      "Add a work experience entry. Write description bullets in strong resume style (action verb + what + impact), but only from facts the user gave.",
    input_schema: {
      type: "object" as const,
      properties: {
        company: str,
        role: str,
        location: str,
        startDate: { ...str, description: "e.g. 'Jan 2022' or '2022'. Leave empty if unknown — never guess." },
        endDate: { ...str, description: "e.g. 'Mar 2024', or 'Present' if current" },
        current: { type: "boolean" as const },
        description: { ...strArr, description: "Achievement bullets, 1-5 items" },
      },
      required: ["company", "role"],
    },
  },
  {
    name: "update_experience",
    description:
      "Update an existing experience entry by its zero-based index from the CV snapshot. Only include fields to change. `description` replaces all bullets.",
    input_schema: {
      type: "object" as const,
      properties: {
        index: { type: "integer" as const },
        company: str,
        role: str,
        location: str,
        startDate: str,
        endDate: str,
        current: { type: "boolean" as const },
        description: strArr,
      },
      required: ["index"],
    },
  },
  {
    name: "remove_experience",
    description: "Remove an experience entry by index. Only when the user asks.",
    input_schema: {
      type: "object" as const,
      properties: { index: { type: "integer" as const } },
      required: ["index"],
    },
  },
  {
    name: "add_education",
    description: "Add an education entry.",
    input_schema: {
      type: "object" as const,
      properties: {
        institution: str,
        degree: { ...str, description: "e.g. 'B.Sc.', 'M.A.'" },
        field: { ...str, description: "Field of study, e.g. 'Computer Science'" },
        location: str,
        startDate: str,
        endDate: str,
        gpa: str,
        achievements: { ...strArr, description: "Honors, relevant coursework — optional" },
      },
      required: ["institution"],
    },
  },
  {
    name: "update_education",
    description: "Update an education entry by index. Only include fields to change.",
    input_schema: {
      type: "object" as const,
      properties: {
        index: { type: "integer" as const },
        institution: str,
        degree: str,
        field: str,
        location: str,
        startDate: str,
        endDate: str,
        gpa: str,
        achievements: strArr,
      },
      required: ["index"],
    },
  },
  {
    name: "remove_education",
    description: "Remove an education entry by index. Only when the user asks.",
    input_schema: {
      type: "object" as const,
      properties: { index: { type: "integer" as const } },
      required: ["index"],
    },
  },
  {
    name: "set_skills",
    description:
      "Replace the full skills list. Pass the complete list every time (existing + new), deduplicated, most relevant first.",
    input_schema: {
      type: "object" as const,
      properties: { skills: strArr },
      required: ["skills"],
    },
  },
  {
    name: "set_languages",
    description:
      "Replace the spoken-languages list, e.g. ['English (fluent)', 'Hebrew (native)']. Pass the complete list.",
    input_schema: {
      type: "object" as const,
      properties: { languages: strArr },
      required: ["languages"],
    },
  },
  {
    name: "add_project",
    description: "Add a personal/side project entry.",
    input_schema: {
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
  {
    name: "update_project",
    description: "Update a project by index. Only include fields to change.",
    input_schema: {
      type: "object" as const,
      properties: {
        index: { type: "integer" as const },
        name: str,
        description: str,
        technologies: strArr,
        link: str,
        bullets: strArr,
      },
      required: ["index"],
    },
  },
  {
    name: "remove_project",
    description: "Remove a project by index. Only when the user asks.",
    input_schema: {
      type: "object" as const,
      properties: { index: { type: "integer" as const } },
      required: ["index"],
    },
  },
  {
    name: "add_certification",
    description: "Add a certification or award with issuer and date if known.",
    input_schema: {
      type: "object" as const,
      properties: { name: str, issuer: str, date: str, link: str },
      required: ["name"],
    },
  },
  {
    name: "remove_certification",
    description: "Remove a certification by index. Only when the user asks.",
    input_schema: {
      type: "object" as const,
      properties: { index: { type: "integer" as const } },
      required: ["index"],
    },
  },
  {
    name: "add_custom_section",
    description:
      "Add a custom section (e.g. Volunteering, Military Service, Publications, Awards) with bullet items.",
    input_schema: {
      type: "object" as const,
      properties: { title: str, items: strArr },
      required: ["title", "items"],
    },
  },
  {
    name: "remove_custom_section",
    description: "Remove a custom section by index. Only when the user asks.",
    input_schema: {
      type: "object" as const,
      properties: { index: { type: "integer" as const } },
      required: ["index"],
    },
  },
  {
    name: "rewrite_bullet",
    description:
      "Replace ONE bullet line with a stronger version, leaving every other bullet untouched. Use this instead of update_experience when you are improving a single line. Keep the person's real facts — never invent a metric.",
    input_schema: {
      type: "object" as const,
      properties: {
        section: {
          type: "string" as const,
          enum: ["experience", "projects", "education", "custom"],
          description: "Which list the entry lives in.",
        },
        index: {
          type: "integer" as const,
          minimum: 0,
          description: "Zero-based entry index from the CV snapshot, e.g. 1 in [1.2].",
        },
        bulletIndex: {
          type: "integer" as const,
          minimum: 0,
          description: "Zero-based bullet index within that entry, e.g. 2 in [1.2].",
        },
        text: { ...str, description: "The full replacement line." },
      },
      required: ["section", "index", "bulletIndex", "text"],
    },
  },
  {
    name: "remove_bullet",
    description:
      "Delete ONE bullet line — use for filler, duplicated points, or to cut a CV down to one page. Remove the weakest line, never a person's only evidence for a role.",
    input_schema: {
      type: "object" as const,
      properties: {
        section: {
          type: "string" as const,
          enum: ["experience", "projects", "education", "custom"],
          description: "Which list the entry lives in.",
        },
        index: { type: "integer" as const, minimum: 0, description: "Zero-based entry index." },
        bulletIndex: {
          type: "integer" as const,
          minimum: 0,
          description: "Zero-based bullet index within that entry.",
        },
      },
      required: ["section", "index", "bulletIndex"],
    },
  },
  {
    name: "insert_bullet",
    description:
      "Add ONE bullet line to an existing entry. Only for facts the user actually gave you.",
    input_schema: {
      type: "object" as const,
      properties: {
        section: {
          type: "string" as const,
          enum: ["experience", "projects", "education", "custom"],
          description: "Which list the entry lives in.",
        },
        index: { type: "integer" as const, minimum: 0, description: "Zero-based entry index." },
        text: { ...str, description: "The new line." },
        atIndex: {
          type: "integer" as const,
          minimum: 0,
          description: "Where to insert. Omit to append at the end.",
        },
      },
      required: ["section", "index", "text"],
    },
  },
  {
    name: "set_design",
    description:
      "Set the CV's visual format — template, accent color, and density — so the document looks polished, not just the default. The template also picks the font family. Call this ONCE after importing an uploaded CV or once there's enough content, and again only if the user asks for a different look. Choose a template that fits the person's field, an accent color that's tasteful for it, and font/spacing levels (1=tight/small … 10=airy/large; 4-6 is normal) that keep the CV to one page — tighten when there's a lot of content.",
    input_schema: {
      type: "object" as const,
      properties: {
        template: {
          type: "string" as const,
          enum: [...DESIGN_TEMPLATES],
          description:
            "Pick by field: conservative (finance, law, academia, ops) → ivy-league, ledger, spotlight, or executive. Software/data/engineering → techie, devfolio, or modern-sidebar. Design/marketing/creative → creative, canvas, aurora, or banner. General professional → modern-sidebar, double-column, or minimalist. Compact when content is dense.",
        },
        accentColor: {
          type: "string" as const,
          enum: [...DESIGN_COLORS],
          description:
            "Tasteful for the field: navy/slate/black for conservative roles, indigo/blue/violet for tech, amber/rose/orange for creative. When unsure, navy or slate.",
        },
        fontLevel: {
          type: "integer" as const,
          minimum: 1,
          maximum: 10,
          description: "Text size, 1 (small) – 10 (large). 5 is normal; drop to 3-4 for a content-heavy CV.",
        },
        spacingLevel: {
          type: "integer" as const,
          minimum: 1,
          maximum: 10,
          description: "Whitespace, 1 (tight) – 10 (airy). 5 is normal; drop to 3-4 to fit more on one page.",
        },
      },
    },
  },
];

function s(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function sa(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.map((x) => String(x)).filter(Boolean);
}

function pick<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

function atIndex(input: Record<string, unknown>, length: number): number {
  const i = Number(input.index);
  if (!Number.isInteger(i) || i < 0 || i >= length) return -1;
  return i;
}

/** One edit against a single entry's bullet list. */
type BulletOp =
  | { kind: "rewrite"; at: number; text: string }
  | { kind: "remove"; at: number }
  | { kind: "insert"; at: number; text: string };

/**
 * Apply a bullet op to a plain string[] list. Returns null for any no-op
 * (out-of-range index, or a rewrite that changes nothing) so callers can
 * return the SAME ResumeData reference — identity is what stops the preview
 * and autosave from churning on a confused model's call.
 */
function editBulletList(bullets: string[], op: BulletOp): string[] | null {
  if (op.kind === "rewrite") {
    if (op.at < 0 || op.at >= bullets.length) return null;
    if (bullets[op.at] === op.text) return null;
    return bullets.map((b, i) => (i === op.at ? op.text : b));
  }
  if (op.kind === "remove") {
    if (op.at < 0 || op.at >= bullets.length) return null;
    return bullets.filter((_, i) => i !== op.at);
  }
  const at = Math.min(Math.max(op.at, 0), bullets.length);
  return [...bullets.slice(0, at), op.text, ...bullets.slice(at)];
}

/**
 * Read one entry's bullet lines. Returns null when the section or entry index
 * is out of range. Shared with the review layer's target resolver so both
 * agree on what "bullet [1.2]" means.
 */
export function getEntryBullets(
  data: ResumeData,
  section: BulletSection,
  index: number
): string[] | null {
  switch (section) {
    case "experience":
      return data.experience[index]?.description ?? null;
    case "projects":
      return data.projects[index]?.bullets ?? null;
    case "education":
      return data.education[index]?.achievements ?? null;
    case "customSections":
      return data.customSections[index]?.items.map((it) => it.text) ?? null;
    default:
      return null;
  }
}

/** Apply one bullet op, preserving custom-section item ids on rewrite. */
function applyBulletOp(
  data: ResumeData,
  section: BulletSection,
  index: number,
  op: BulletOp
): ResumeData {
  switch (section) {
    case "experience": {
      const entry = data.experience[index];
      if (!entry) return data;
      const next = editBulletList(entry.description, op);
      if (!next) return data;
      return {
        ...data,
        experience: data.experience.map((e, i) => (i === index ? { ...e, description: next } : e)),
      };
    }
    case "projects": {
      const entry = data.projects[index];
      if (!entry) return data;
      const next = editBulletList(entry.bullets, op);
      if (!next) return data;
      return {
        ...data,
        projects: data.projects.map((p, i) => (i === index ? { ...p, bullets: next } : p)),
      };
    }
    case "education": {
      const entry = data.education[index];
      if (!entry) return data;
      const next = editBulletList(entry.achievements, op);
      if (!next) return data;
      return {
        ...data,
        education: data.education.map((e, i) => (i === index ? { ...e, achievements: next } : e)),
      };
    }
    case "customSections": {
      const entry = data.customSections[index];
      if (!entry) return data;
      const items = entry.items;
      let nextItems;
      if (op.kind === "rewrite") {
        if (op.at < 0 || op.at >= items.length) return data;
        if (items[op.at].text === op.text) return data;
        // Keep the item's id so React keys and any saved reference survive.
        nextItems = items.map((it, i) => (i === op.at ? { ...it, text: op.text } : it));
      } else if (op.kind === "remove") {
        if (op.at < 0 || op.at >= items.length) return data;
        nextItems = items.filter((_, i) => i !== op.at);
      } else {
        const at = Math.min(Math.max(op.at, 0), items.length);
        nextItems = [
          ...items.slice(0, at),
          { id: generateId(), text: op.text },
          ...items.slice(at),
        ];
      }
      return {
        ...data,
        customSections: data.customSections.map((cs, i) =>
          i === index ? { ...cs, items: nextItems } : cs
        ),
      };
    }
    default:
      return data;
  }
}

/** Shared arg parsing for the three bullet tools. */
function bulletTarget(
  input: Record<string, unknown>
): { section: BulletSection; index: number } | null {
  const section = normalizeBulletSection(input.section);
  if (!section) return null;
  const index = Number(input.index);
  if (!Number.isInteger(index) || index < 0) return null;
  return { section, index };
}

/**
 * Pure reducer: apply one tool call to a ResumeData value.
 * Unknown tools and out-of-range indices are no-ops (returns the same
 * reference) so a confused model can never corrupt the CV.
 */
export function applyCvToolCall(
  data: ResumeData,
  name: string,
  input: Record<string, unknown>
): ResumeData {
  switch (name as CvToolName) {
    case "update_personal_info": {
      const patch = pick({
        name: s(input.name),
        email: s(input.email),
        phone: s(input.phone),
        linkedin: s(input.linkedin),
        website: s(input.website),
        location: s(input.location),
        title: s(input.title),
      });
      if (Object.keys(patch).length === 0) return data;
      return { ...data, personalInfo: { ...data.personalInfo, ...patch } };
    }

    case "update_summary": {
      const summary = s(input.summary);
      if (summary === undefined) return data;
      return { ...data, summary };
    }

    case "add_experience": {
      const entry: Experience = {
        id: generateId(),
        company: s(input.company) ?? "",
        role: s(input.role) ?? "",
        location: s(input.location) ?? "",
        startDate: s(input.startDate) ?? "",
        endDate: input.current === true ? "Present" : s(input.endDate) ?? "",
        current: input.current === true,
        description: sa(input.description) ?? [],
      };
      if (!entry.company && !entry.role) return data;
      return { ...data, experience: [...data.experience, entry] };
    }

    case "update_experience": {
      const i = atIndex(input, data.experience.length);
      if (i === -1) return data;
      const patch = pick({
        company: s(input.company),
        role: s(input.role),
        location: s(input.location),
        startDate: s(input.startDate),
        endDate: s(input.endDate),
        current: typeof input.current === "boolean" ? input.current : undefined,
        description: sa(input.description),
      });
      return {
        ...data,
        experience: data.experience.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
      };
    }

    case "remove_experience": {
      const i = atIndex(input, data.experience.length);
      if (i === -1) return data;
      return { ...data, experience: data.experience.filter((_, idx) => idx !== i) };
    }

    case "add_education": {
      const entry: Education = {
        id: generateId(),
        institution: s(input.institution) ?? "",
        degree: s(input.degree) ?? "",
        field: s(input.field) ?? "",
        location: s(input.location) ?? "",
        startDate: s(input.startDate) ?? "",
        endDate: s(input.endDate) ?? "",
        gpa: s(input.gpa) || undefined,
        achievements: sa(input.achievements) ?? [],
      };
      if (!entry.institution) return data;
      return { ...data, education: [...data.education, entry] };
    }

    case "update_education": {
      const i = atIndex(input, data.education.length);
      if (i === -1) return data;
      const patch = pick({
        institution: s(input.institution),
        degree: s(input.degree),
        field: s(input.field),
        location: s(input.location),
        startDate: s(input.startDate),
        endDate: s(input.endDate),
        gpa: s(input.gpa),
        achievements: sa(input.achievements),
      });
      return {
        ...data,
        education: data.education.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
      };
    }

    case "remove_education": {
      const i = atIndex(input, data.education.length);
      if (i === -1) return data;
      return { ...data, education: data.education.filter((_, idx) => idx !== i) };
    }

    case "set_skills": {
      const skills = sa(input.skills);
      if (!skills) return data;
      return { ...data, skills: Array.from(new Set(skills)).slice(0, 40) };
    }

    case "set_languages": {
      const languages = sa(input.languages);
      if (!languages) return data;
      return { ...data, languages: Array.from(new Set(languages)).slice(0, 12) };
    }

    case "add_project": {
      const entry: Project = {
        id: generateId(),
        name: s(input.name) ?? "",
        description: s(input.description) ?? "",
        technologies: sa(input.technologies) ?? [],
        link: s(input.link) || undefined,
        bullets: sa(input.bullets) ?? [],
      };
      if (!entry.name) return data;
      return { ...data, projects: [...data.projects, entry] };
    }

    case "update_project": {
      const i = atIndex(input, data.projects.length);
      if (i === -1) return data;
      const patch = pick({
        name: s(input.name),
        description: s(input.description),
        technologies: sa(input.technologies),
        link: s(input.link),
        bullets: sa(input.bullets),
      });
      return {
        ...data,
        projects: data.projects.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
      };
    }

    case "remove_project": {
      const i = atIndex(input, data.projects.length);
      if (i === -1) return data;
      return { ...data, projects: data.projects.filter((_, idx) => idx !== i) };
    }

    case "add_certification": {
      const name_ = s(input.name);
      if (!name_) return data;
      return {
        ...data,
        certifications: [
          ...data.certifications,
          {
            id: generateId(),
            name: name_,
            issuer: s(input.issuer) ?? "",
            date: s(input.date) ?? "",
            link: s(input.link) || undefined,
          },
        ],
      };
    }

    case "remove_certification": {
      const i = atIndex(input, data.certifications.length);
      if (i === -1) return data;
      return { ...data, certifications: data.certifications.filter((_, idx) => idx !== i) };
    }

    case "add_custom_section": {
      const title = s(input.title);
      const items = sa(input.items);
      if (!title || !items || items.length === 0) return data;
      return {
        ...data,
        customSections: [
          ...data.customSections,
          {
            id: generateId(),
            title,
            items: items.map((text) => ({ id: generateId(), text })),
          },
        ],
      };
    }

    case "remove_custom_section": {
      const i = atIndex(input, data.customSections.length);
      if (i === -1) return data;
      return { ...data, customSections: data.customSections.filter((_, idx) => idx !== i) };
    }

    case "rewrite_bullet": {
      const target = bulletTarget(input);
      if (!target) return data;
      const text = s(input.text)?.trim();
      if (!text) return data; // never blank a line out via "rewrite"
      const at = Number(input.bulletIndex);
      if (!Number.isInteger(at)) return data;
      return applyBulletOp(data, target.section, target.index, { kind: "rewrite", at, text });
    }

    case "remove_bullet": {
      const target = bulletTarget(input);
      if (!target) return data;
      const at = Number(input.bulletIndex);
      if (!Number.isInteger(at)) return data;
      return applyBulletOp(data, target.section, target.index, { kind: "remove", at });
    }

    case "insert_bullet": {
      const target = bulletTarget(input);
      if (!target) return data;
      const text = s(input.text)?.trim();
      if (!text) return data;
      const raw = Number(input.atIndex);
      const existing = getEntryBullets(data, target.section, target.index);
      if (!existing) return data;
      const at = Number.isInteger(raw) && raw >= 0 ? raw : existing.length;
      return applyBulletOp(data, target.section, target.index, { kind: "insert", at, text });
    }

    default:
      return data;
  }
}

/**
 * Translate function for the chip labels below — same `(source, vars)` shape
 * as the app-wide English-as-key i18n (`useT().t` on the client,
 * `getServerT().t` on the server). Callers that don't pass one get plain
 * English via the identity translator, so lib-level code stays i18n-agnostic
 * while render sites can localize.
 */
export type ChatLabelTranslate = (
  source: string,
  vars?: Record<string, string | number>
) => string;

/** Identity translator: English key + {var} interpolation (mirrors lib/i18n). */
const englishT: ChatLabelTranslate = (source, vars) =>
  vars ? source.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m)) : source;

/** Short label for the "✦ Updated …" chip shown in the chat thread. */
export function describeToolCall(
  name: string,
  input: Record<string, unknown>,
  t: ChatLabelTranslate = englishT
): string {
  switch (name as CvToolName) {
    case "update_personal_info":
      return t("Updated your details");
    case "update_summary":
      return t("Wrote your summary");
    case "add_experience": {
      const role = s(input.role);
      const company = s(input.company);
      if (role && company) return t("Added {role} at {company}", { role, company });
      if (role) return t("Added {role}", { role });
      if (company) return t("Added a role at {company}", { company });
      return t("Added a role");
    }
    case "update_experience":
      return t("Polished an experience entry");
    case "remove_experience":
      return t("Removed an experience entry");
    case "add_education": {
      const institution = s(input.institution);
      return institution
        ? t("Added education — {institution}", { institution })
        : t("Added education");
    }
    case "update_education":
      return t("Updated education");
    case "remove_education":
      return t("Removed education");
    case "set_skills":
      return t("Updated skills ({count})", { count: sa(input.skills)?.length ?? 0 });
    case "set_languages":
      return t("Updated languages");
    case "add_project": {
      const project = s(input.name);
      return project ? t("Added project — {project}", { project }) : t("Added a project");
    }
    case "update_project":
      return t("Updated a project");
    case "remove_project":
      return t("Removed a project");
    case "add_certification": {
      const cert = s(input.name);
      return cert ? t("Added {cert}", { cert }) : t("Added a certification");
    }
    case "remove_certification":
      return t("Removed a certification");
    case "add_custom_section": {
      const title = s(input.title);
      return title ? t("Added “{title}”", { title }) : t("Added a section");
    }
    case "remove_custom_section":
      return t("Removed a section");
    case "rewrite_bullet":
      return t("Rewrote a bullet");
    case "remove_bullet":
      return t("Cut a bullet");
    case "insert_bullet":
      return t("Added a bullet");
    case "set_design":
      return t("Styled your CV");
    default:
      return t("Updated your CV");
  }
}

/**
 * Compact CV snapshot embedded in the system prompt each turn — gives the
 * model the indices it needs for update/remove targeting without burning
 * tokens on internal ids.
 */
export function snapshotForPrompt(data: ResumeData): string {
  const lines: string[] = [];
  const pi = data.personalInfo;
  lines.push(
    `PERSONAL: name=${JSON.stringify(pi.name)} title=${JSON.stringify(pi.title)} email=${JSON.stringify(
      pi.email
    )} phone=${JSON.stringify(pi.phone)} location=${JSON.stringify(pi.location)} linkedin=${JSON.stringify(
      pi.linkedin
    )} website=${JSON.stringify(pi.website)}`
  );
  lines.push(`SUMMARY: ${JSON.stringify(data.summary)}`);
  lines.push(`EXPERIENCE (${data.experience.length}):`);
  data.experience.forEach((e, i) => {
    lines.push(
      `  [${i}] ${e.role} @ ${e.company} (${e.startDate || "?"} – ${e.current ? "Present" : e.endDate || "?"})${
        e.location ? `, ${e.location}` : ""
      }`
    );
    // Bullets carry [entry.bullet] indices so the model can target ONE line
    // with rewrite_bullet / remove_bullet instead of replacing the whole entry.
    e.description.forEach((b, bi) => lines.push(`      [${i}.${bi}] ${b}`));
  });
  lines.push(`EDUCATION (${data.education.length}):`);
  data.education.forEach((e, i) => {
    lines.push(
      `  [${i}] ${e.degree}${e.field ? ` in ${e.field}` : ""} — ${e.institution} (${e.startDate || "?"} – ${
        e.endDate || "?"
      })`
    );
    e.achievements.forEach((a, ai) => lines.push(`      [${i}.${ai}] ${a}`));
  });
  lines.push(`SKILLS: ${data.skills.join(", ") || "(none)"}`);
  lines.push(`LANGUAGES: ${data.languages.join(", ") || "(none)"}`);
  lines.push(`PROJECTS (${data.projects.length}):`);
  data.projects.forEach((p, i) => {
    lines.push(`  [${i}] ${p.name} — ${p.description}`);
    p.bullets.forEach((b, bi) => lines.push(`      [${i}.${bi}] ${b}`));
  });
  lines.push(`CERTIFICATIONS (${data.certifications.length}):`);
  data.certifications.forEach((c, i) => lines.push(`  [${i}] ${c.name}${c.issuer ? ` — ${c.issuer}` : ""}`));
  lines.push(`CUSTOM SECTIONS (${data.customSections.length}):`);
  data.customSections.forEach((cs, i) =>
    lines.push(`  [${i}] ${cs.title}: ${cs.items.map((it) => it.text).join(" | ")}`)
  );
  return lines.join("\n");
}

/** Present-progressive label shown while a tool call's args are still
 * streaming — resolved into describeToolCall's past-tense label on apply.
 * Pass the app's `t` (see ChatLabelTranslate) to localize; defaults to
 * English. */
export function pendingToolLabel(name: string, t: ChatLabelTranslate = englishT): string {
  switch (name as CvToolName) {
    case "update_personal_info":
      return t("Updating your details…");
    case "update_summary":
      return t("Writing your summary…");
    case "add_experience":
      return t("Adding a role…");
    case "update_experience":
      return t("Polishing an experience entry…");
    case "remove_experience":
      return t("Removing an experience entry…");
    case "add_education":
      return t("Adding education…");
    case "update_education":
      return t("Updating education…");
    case "remove_education":
      return t("Removing education…");
    case "set_skills":
      return t("Updating skills…");
    case "set_languages":
      return t("Updating languages…");
    case "add_project":
      return t("Adding a project…");
    case "update_project":
      return t("Updating a project…");
    case "remove_project":
      return t("Removing a project…");
    case "add_certification":
      return t("Adding a certification…");
    case "remove_certification":
      return t("Removing a certification…");
    case "add_custom_section":
      return t("Adding a section…");
    case "remove_custom_section":
      return t("Removing a section…");
    case "rewrite_bullet":
      return t("Rewriting a bullet…");
    case "remove_bullet":
      return t("Cutting a bullet…");
    case "insert_bullet":
      return t("Adding a bullet…");
    case "set_design":
      return t("Styling your CV…");
    default:
      return t("Updating your CV…");
  }
}

// ResumeData (the content model) → the shape every CV template renders.
// One mapping for the whole app. Text is passed through exactly as the user
// wrote it unless a caller injects formatters (the legacy builder title-cases
// names and job titles; v2 never rewrites what the user typed).

import type { ResumeData } from "@/types/resume";
import { inSectionOrder } from "./sectionOrder";
import { withoutBlanks } from "./substance";
import type { ResumeData as TemplateData } from "@/components/cv-templates/templates/TemplateProps";

export type { TemplateData };

export type ViewFormatters = {
  name?: (s: string) => string;
  jobTitle?: (s: string) => string;
  /** Shown on a CV with no name yet. UI text, so callers pass it in the reader's language. */
  placeholderName?: string;
};

const keep = (s: string) => s;

export function formatDateRange(startDate?: string, endDate?: string, current?: boolean): string {
  const start = startDate?.trim() || "";
  const end = current ? "Present" : endDate?.trim() || "";
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

export function toTemplateData(raw: ResumeData, fmt: ViewFormatters = {}): TemplateData {
  // An entry with nothing in it stays out of the CV: a bare heading reads as a mistake.
  const c = withoutBlanks(raw);
  const name = fmt.name ?? keep;
  const jobTitle = fmt.jobTitle ?? keep;
  const nonEmpty = (xs: string[] | undefined) => (xs ?? []).filter((x) => x && x.trim());
  return {
    name: name(c.personalInfo.name) || (fmt.placeholderName ?? "Your Name"),
    title: jobTitle(c.personalInfo.title) || undefined,
    contact: {
      email: c.personalInfo.email || undefined,
      phone: c.personalInfo.phone || undefined,
      location: c.personalInfo.location || undefined,
      linkedin: c.personalInfo.linkedin || undefined,
      website: c.personalInfo.website || undefined,
    },
    summary: c.summary || undefined,
    skills: nonEmpty(c.skills),
    languages: nonEmpty(c.languages),
    photo: c.personalInfo.photo || undefined,
    sections: inSectionOrder(c, [
      ...(c.experience.length
        ? [
            {
              id: "experience",
              title: "Experience",
              type: "experience" as const,
              items: c.experience.map((e) => ({
                id: e.id,
                title: jobTitle(e.role),
                subtitle: e.company,
                date: formatDateRange(e.startDate, e.endDate, e.current),
                location: e.location || undefined,
                bullets: nonEmpty(e.description),
              })),
            },
          ]
        : []),
      ...(c.education.length
        ? [
            {
              id: "education",
              title: "Education",
              type: "education" as const,
              items: c.education.map((e) => ({
                id: e.id,
                title: e.degree + (e.field ? ` in ${e.field}` : ""),
                subtitle: e.institution,
                date: formatDateRange(e.startDate, e.endDate),
                location: e.location || undefined,
                description: e.gpa ? `GPA: ${e.gpa}` : undefined,
                bullets: nonEmpty(e.achievements),
              })),
            },
          ]
        : []),
      ...(c.projects.length
        ? [
            {
              id: "projects",
              title: "Projects",
              type: "projects" as const,
              items: c.projects.map((p) => ({
                id: p.id,
                title: p.name,
                subtitle: p.technologies?.join(", ") || undefined,
                description: p.description || undefined,
                bullets: nonEmpty(p.bullets),
              })),
            },
          ]
        : []),
      ...(c.certifications.length
        ? [
            {
              id: "certifications",
              title: "Certifications",
              type: "certifications" as const,
              items: c.certifications.map((x) => ({ id: x.id, title: x.name, subtitle: x.issuer, date: x.date || undefined })),
            },
          ]
        : []),
      // A section with nothing in it yet stays out of the CV: a bare heading reads as a mistake.
      ...c.customSections.filter((s) => s.items.some((it) => it.text.trim())).map((s) => ({
        id: s.id,
        title: s.title,
        type: "custom" as const,
        items: s.items.filter((it) => it.text.trim()).map((it) => ({ id: it.id, description: it.text })),
      })),
    ]),
  };
}

// What a CV actually says, as opposed to what slots it has. "Add role" creates
// an empty entry, so `experience.length > 0` once counted a blank role as
// done: the checklist ticked it, the free score paid for it, and tailoring,
// cover letters and interviews let a CV with no experience through. Every
// "does this CV have X" question goes through here instead of an array length.

import type { Certification, Education, Experience, Project, ResumeData } from "@/types/resume";
import { isPlaceholderSummary } from "@/lib/chat/prompts";

const has = (s: string | undefined | null) => !!s && s.trim().length > 0;
const lines = (xs: string[] | undefined) => (xs ?? []).filter(has);

export const isFilledExperience = (e: Experience) => has(e.role) || has(e.company) || lines(e.description).length > 0;
export const isFilledEducation = (e: Education) => has(e.institution) || has(e.degree) || has(e.field);
export const isFilledProject = (p: Project) => has(p.name) || has(p.description) || lines(p.bullets).length > 0;
export const isFilledCertification = (x: Certification) => has(x.name) || has(x.issuer);

export const filledExperience = (c: ResumeData) => c.experience.filter(isFilledExperience);
export const filledEducation = (c: ResumeData) => c.education.filter(isFilledEducation);
export const realSkills = (c: ResumeData) => lines(c.skills);
/** Every non-empty experience bullet, trimmed. */
export const realBullets = (c: ResumeData) => c.experience.flatMap((e) => lines(e.description).map((b) => b.trim()));
export const realSummary = (c: ResumeData) => (isPlaceholderSummary(c.summary) ? "" : c.summary.trim());

// Loose on purpose: catches typos ("dana@gmail", "dana gmail.com"), not every RFC corner.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/;
export const isEmail = (s: string) => EMAIL_RE.test(s.trim());
/** A phone has 7 to 15 digits (E.164), whatever the separators. */
export const isPhone = (s: string) => {
  const digits = s.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15 && /^[+\d\s().\-/]+$/.test(s.trim());
};

/** Anything a reader (or a check) could read beyond the header. */
export function hasBody(c: ResumeData): boolean {
  return (
    filledExperience(c).length > 0 ||
    filledEducation(c).length > 0 ||
    realSkills(c).length > 0 ||
    !!realSummary(c) ||
    c.projects.some(isFilledProject) ||
    c.certifications.some(isFilledCertification) ||
    c.customSections.some((s) => s.items.some((it) => has(it.text)))
  );
}

/**
 * The CV as a reader sees it: entries with nothing in them are dropped (and
 * blank bullets and skills with them). Every output reads this, so the
 * preview, Word, plain text and the one-page fit estimate always agree.
 */
export function withoutBlanks(c: ResumeData): ResumeData {
  return {
    ...c,
    experience: filledExperience(c).map((e) => ({ ...e, description: lines(e.description) })),
    education: filledEducation(c).map((e) => ({ ...e, achievements: lines(e.achievements) })),
    projects: c.projects.filter(isFilledProject).map((p) => ({ ...p, bullets: lines(p.bullets), technologies: lines(p.technologies) })),
    certifications: c.certifications.filter(isFilledCertification),
    skills: realSkills(c),
    languages: lines(c.languages),
    customSections: c.customSections.map((s) => ({ ...s, items: s.items.filter((it) => has(it.text)) })),
  };
}

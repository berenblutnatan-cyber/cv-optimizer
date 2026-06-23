// Lightweight runtime validator for the finalize output. Mirrors ResumeData
// from /types/resume.ts without depending on Zod (kept lean — we run on the
// edge runtime). Returns a cleaned-up ResumeData even when the model omits
// fields or adds extras.

import type { ResumeData } from "@/types/resume";
import { generateId } from "@/types/resume";

function s(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  return String(value);
}

function strArr(value: unknown, max = 30): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => s(v)).filter(Boolean).slice(0, max);
}

export function normalizeFinalizeOutput(raw: unknown): ResumeData {
  const o = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) ?? {};
  const pi = (o.personalInfo && typeof o.personalInfo === "object"
    ? (o.personalInfo as Record<string, unknown>)
    : {}) ?? {};

  const experience = Array.isArray(o.experience)
    ? (o.experience as Array<Record<string, unknown>>).map((e) => {
        const desc = strArr(e.description, 8);
        return {
          id: s(e.id, generateId()),
          company: s(e.company),
          role: s(e.role),
          location: s(e.location),
          startDate: s(e.startDate),
          endDate: s(e.endDate, "Present"),
          current: Boolean(e.current),
          description: desc,
        };
      })
    : [];

  const education = Array.isArray(o.education)
    ? (o.education as Array<Record<string, unknown>>).map((e) => ({
        id: s(e.id, generateId()),
        institution: s(e.institution),
        degree: s(e.degree),
        field: s(e.field),
        location: s(e.location),
        startDate: s(e.startDate),
        endDate: s(e.endDate),
        gpa: s(e.gpa) || undefined,
        achievements: strArr(e.achievements, 6),
      }))
    : [];

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
    summary: s(o.summary),
    experience,
    education,
    skills: strArr(o.skills, 30),
    projects: [],
    certifications: [],
    languages: strArr(o.languages, 10),
    customSections: [],
  };
}

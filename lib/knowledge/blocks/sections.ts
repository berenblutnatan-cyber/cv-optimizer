// Section-level standards by seniority. Source skill: resume-section-builder
// (the concrete budgets/rules only; overlap with formatter/tech dropped).

import type { Seniority } from "../types";

const BULLET_BUDGETS: Record<Seniority, string> = {
  entry: "Entry level: 3-5 bullets per role; include relevant projects/coursework; initiative and learning count as achievements.",
  early: "Early career (1-3y): 4-5 bullets on the current role, 2-3 on older ones; achievements over duties.",
  mid: "Mid-career (3-5y): 4-6 bullets on recent roles, 2-3 on older; strong metrics throughout.",
  senior: "Senior (5-10y): 5-6 bullets on recent roles, 2-3 on older; emphasize leadership, scope, and increasing responsibility.",
  lead: "Lead/executive (10+y): 5-6 bullets on recent roles, 2 on older; strategy and organizational impact over task detail; older roles compress hard.",
};

export function sectionStandards(seniority: Seniority | null | undefined): string {
  const budget = seniority ? BULLET_BUDGETS[seniority] : "Bullet budgets: recent roles 4-6 bullets, older roles 2-3.";
  return `SECTION STANDARDS:
- ${budget}
- Summary formula: [Title/Identity] + [Years] + [Key Skills] + [Value Proposition]; ban "Seeking a challenging position", "Hard-working team player", third person.
- Education: keep GPA only if ≥3.5 (or local equivalent); drop graduation year for 10+y careers; coursework only for entry level.
- Skills: most relevant first, mirror the JD's exact terms, exclude assumed basics (MS Office).`;
}

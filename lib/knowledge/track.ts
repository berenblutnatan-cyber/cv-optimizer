// Track + seniority detection. Pure, deterministic, offline-tested by
// scripts/knowledge-eval.ts against the full 37-role onboarding taxonomy.
//
// Design notes:
// - Executive keywords WIN over everything ("VP Engineering" → executive).
// - Bare "engineer" is NOT tech: Civil/Mechanical/Electrical Engineer are
//   onboarding roles and must resolve to general. Tech requires a software/
//   data keyword hit.
// - Detection failure is safe: "general" just means no track-specific flavor.

import type { Seniority, Track } from "./types";

const EXEC_RE =
  /\b(chief|cto|ceo|cfo|cmo|coo|cpo|ciso|cio|vp|vice president|svp|evp|head of|director|general manager|managing director|president|founder|co-founder)\b/i;

const TECH_RE =
  /\b(software|frontend|front-end|backend|back-end|full[- ]?stack|mobile developer|ios|android|devops|sre|site reliability|qa engineer|data analyst|data scientist|data engineer|machine learning|ml engineer|ai engineer|platform engineer|security engineer|cloud (engineer|architect)|solutions architect|software architect|product manager|product owner|developer|programmer|swe|web developer|embedded|(react|angular|vue|node(\.js)?|python|java|golang|kotlin|swift|rust|\.net|typescript) (developer|engineer))\b/i;

const ACADEMIC_RE =
  /\b(professor|postdoc|post-doc|lecturer|researcher|research (fellow|scientist|assistant|associate)|faculty|phd candidate|principal investigator|scholar)\b/i;

const CREATIVE_RE =
  /\b(ux|ui designer|product designer|graphic designer|visual designer|brand designer|art director|creative director|illustrator|motion designer|copywriter|content writer|photographer|videographer|animator)\b/i;

// Roles that contain "engineer" but are NOT software (must beat TECH_RE's
// generic hits — checked before it).
const NON_TECH_ENGINEER_RE =
  /\b(civil|mechanical|electrical|structural|chemical|industrial|aerospace|biomedical|environmental|petroleum) engineer/i;

/** Detect the target track from the job title (and optionally the JD).
 *  The title decides; the JD only breaks a "general" tie. */
export function detectTrack(jobTitle: string, jobDescription?: string): Track {
  const title = (jobTitle || "").trim();
  if (title) {
    if (EXEC_RE.test(title)) return "executive";
    if (ACADEMIC_RE.test(title)) return "academic";
    if (NON_TECH_ENGINEER_RE.test(title)) return "general";
    if (TECH_RE.test(title)) return "tech";
    if (CREATIVE_RE.test(title)) return "creative";
  }
  const jd = (jobDescription || "").slice(0, 2000);
  if (jd) {
    if (ACADEMIC_RE.test(jd)) return "academic";
    if (NON_TECH_ENGINEER_RE.test(jd)) return "general";
    if (TECH_RE.test(jd)) return "tech";
    if (CREATIVE_RE.test(jd)) return "creative";
  }
  return "general";
}

/** Map the onboarding funnel's experience buckets to Seniority. Unknown
 *  input → null (optimizer users who never ran the funnel). */
export function seniorityFromExperience(bucket: string | null | undefined): Seniority | null {
  switch ((bucket || "").trim()) {
    case "student":
      return "entry";
    case "1-3":
      return "early";
    case "3-5":
      return "mid";
    case "5-10":
      return "senior";
    case "10+":
      return "lead";
    default:
      return null;
  }
}

/** Career-pivot overlay: true only when BOTH the current role and the target
 *  resolve to confident (non-general) tracks that differ. Conservative by
 *  design — a false negative just means no translation guidance. */
export function detectCareerChange(currentRole: string, targetTrack: Track): boolean {
  if (!currentRole || targetTrack === "general") return false;
  const currentTrack = detectTrack(currentRole);
  return currentTrack !== "general" && currentTrack !== targetTrack;
}

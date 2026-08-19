// The tailoring truth boundary. Source skill: resume-tailor (its one
// genuinely valuable block). Reinforces the pipeline's structural
// anti-fabrication whitelist in the model's own instructions.

export const TRUTH_BOUNDARY = `TRUTH BOUNDARY (tailoring, never lying):
ALLOWED: reorder true content to lead with what's most relevant · adopt the JD's industry-standard terminology for work actually done ("worked with teams" → "managed stakeholder relationships across 5 departments" ONLY if true) · add context/scope the person actually had · trim what's irrelevant to this role.
FORBIDDEN: adding skills/tools the CV never shows · changing or inventing numbers, dates, titles, employers · claiming certifications not held · upgrading scope ("contributed to" → "led") beyond what the CV states.`;

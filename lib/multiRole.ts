// Shared types + prompt for the multi-role CV generation engine.
// Each "card" in the /roles deck is one row in the GeneratedResume table.

export type GeneratedCardInput = {
  baseCvText: string;
  role: string;
};

export type GeneratedCardOutput = {
  role: string;
  // Lightweight Resume-shaped output. The fields here are a strict subset of
  // /types/resume.ts ResumeData so the existing builder/template renderers can
  // ingest the JSON directly. Keep this loose-typed at the wire boundary
  // since Claude occasionally returns minor key drift.
  resumeData: {
    summary: string;
    experience: Array<{
      company: string;
      role: string;
      startDate: string;
      endDate: string;
      bullets: string[];
    }>;
    skills: string[];
    headline?: string;
  };
  score: number; // 0-100
};

// Trimmed variant of the existing /api/optimize prompt focused on a single
// target role. Deliberately concise — we run this N times in parallel and
// every saved token compounds.
export function buildRolePrompt(input: GeneratedCardInput): string {
  return `You are a senior recruiter rewriting a candidate's resume to win a "${input.role}" interview.

Use ONLY facts in the source resume — never invent companies, dates, or numbers. Rewrite for the target role: tighten the summary, rephrase bullets with action verbs and (where the source supports it) quantified impact, and surface the most relevant skills first.

Return STRICT JSON matching:
{
  "headline": "<2-5 word professional headline tuned to ${input.role}>",
  "summary": "<3-4 line professional summary, narrative not metrics, no pronouns>",
  "experience": [
    {
      "company": "<exact company name from source>",
      "role": "<role title>",
      "startDate": "<YYYY or MMM YYYY>",
      "endDate": "<YYYY or 'Present'>",
      "bullets": ["<concise impact bullet>", "..."]
    }
  ],
  "skills": ["<8-10 skills tuned to ${input.role}>"],
  "score": <integer 0-100, your honest estimate of how strong this rewrite is for the target role>
}

Preserve every job entry from the source (do not collapse roles), preserve company names verbatim, and keep dates in the same format the source used. Skip a role if the source has none.

SOURCE RESUME:
${input.baseCvText.slice(0, 16_000)}

Return ONLY the JSON object.`;
}

// Defensive parser — accepts loose JSON and coerces to the wire shape so
// the persistence step never crashes on minor model drift.
export function normalizeRoleCard(role: string, raw: unknown): GeneratedCardOutput {
  const o = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) ?? {};
  const score = (() => {
    const n = Number(o.score);
    if (!Number.isFinite(n)) return 50;
    return Math.max(0, Math.min(100, Math.round(n)));
  })();
  const summary = typeof o.summary === "string" ? o.summary : "";
  const headline = typeof o.headline === "string" ? o.headline : undefined;
  const skills = Array.isArray(o.skills)
    ? (o.skills as unknown[]).map((s) => String(s)).filter(Boolean).slice(0, 12)
    : [];
  const experience = Array.isArray(o.experience)
    ? (o.experience as Array<Record<string, unknown>>).map((e) => ({
        company: String(e.company ?? "").slice(0, 120),
        role: String(e.role ?? "").slice(0, 120),
        startDate: String(e.startDate ?? ""),
        endDate: String(e.endDate ?? ""),
        bullets: Array.isArray(e.bullets)
          ? (e.bullets as unknown[]).map((b) => String(b)).filter(Boolean).slice(0, 6)
          : [],
      }))
    : [];
  return {
    role,
    resumeData: { headline, summary, experience, skills },
    score,
  };
}

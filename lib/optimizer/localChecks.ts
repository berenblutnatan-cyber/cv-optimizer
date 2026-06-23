// Pure, instant, client-side resume scoring — the "live meter" half of the
// Resume Score panel. Runs on every CV edit with NO API call and NO cost, so
// the number can move while the user types. The nuanced judgment (domain fit,
// "is this bullet actually strong") lives behind the optional Opus deep check
// (app/api/score-deep) — this module only does the mechanical checks that are
// deterministic string/count/regex operations.
//
// DETERMINISM CONTRACT: same input -> same output, always. No Date.now(), no
// Math.random(), no generateId(). Problem ids are stable (category + check),
// so the eval (scripts/local-checks-eval.ts) and the UI's React keys are stable
// across recomputes. Do not break this — it's what makes the live ring settle
// instead of flicker.

import type { ResumeData } from "@/types/resume";
import { resumeToText } from "@/types/resume";
import { isPlaceholderSummary } from "@/lib/chat/prompts";
import type { CvToolName } from "@/lib/chat/cvTools";

export type ScoreCategory =
  | "impact"
  | "ats"
  | "clarity"
  | "length"
  | "completeness"
  | "jobMatch";

export type GoalWeighting = "ats" | "recruiter" | "both";

export type ScoreBand = "great" | "strong" | "fair" | "weak" | "poor";

/**
 * How a detected problem gets fixed.
 *  - "deterministic": we can build the exact tool call locally → applied FREE.
 *  - "ai": needs an Opus rewrite → routed through the chat pipeline and gated
 *    (the "paywall the payoff" half).
 */
export type LocalFixDescriptor =
  | { kind: "deterministic"; tool: CvToolName; input: Record<string, unknown> }
  | { kind: "ai"; instruction: string };

export interface LocalProblem {
  id: string; // stable, e.g. "impact:weak-verbs"
  category: ScoreCategory;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  scoreImpact: number; // 1–15, rough points recovered if fixed
  fix?: LocalFixDescriptor;
}

export interface CategoryScore {
  category: ScoreCategory;
  label: string;
  score: number; // 0–100
  weight: number; // goal-derived contribution to overall
  problems: LocalProblem[];
}

export interface LocalScoreResult {
  overall: number; // 0–100 weighted
  band: ScoreBand;
  categories: CategoryScore[];
  hasJobContext: boolean;
}

export interface LocalScoreOptions {
  jobText?: string;
  jobTitle?: string;
  goal?: GoalWeighting;
}

// ── Heuristic vocabularies ──────────────────────────────────────────────────

// Strong resume verbs. Superset of the optimizer's list (lib/optimizer/prompt.ts)
// so the free meter rewards the same language the paid rewrite produces.
const STRONG_VERBS = new Set(
  [
    "spearheaded", "orchestrated", "drove", "executed", "architected", "championed",
    "transformed", "accelerated", "delivered", "scaled", "led", "built", "launched",
    "created", "designed", "developed", "improved", "increased", "reduced", "managed",
    "implemented", "established", "generated", "negotiated", "streamlined", "optimized",
    "founded", "directed", "coordinated", "produced", "achieved", "grew", "cut", "saved",
    "shipped", "owned", "devised", "pioneered", "initiated", "mentored", "trained",
    "automated", "redesigned", "overhauled", "boosted", "expanded", "secured", "closed",
    "exceeded", "drove", "drove", "won", "rebuilt", "introduced", "headed",
  ].map((v) => v.toLowerCase())
);

// Weak bullet openers — the tell of a duties-list resume.
const WEAK_OPENERS = [
  "responsible for", "worked on", "helped", "assisted", "duties included",
  "tasked with", "in charge of", "handled", "involved in", "participated in",
  "contributed to", "responsible",
];

// Clichés recruiters tune out.
const BUZZWORDS = [
  "synergy", "go-getter", "team player", "results-driven", "results-oriented",
  "detail-oriented", "hard worker", "hard-working", "think outside the box",
  "self-starter", "go-to person", "fast-paced", "rockstar", "ninja", "guru",
  "world-class", "best of breed", "value add", "out of the box", "wheelhouse",
];

// Generic words that carry no signal as JD "keywords".
const STOPWORDS = new Set(
  [
    "the", "and", "for", "with", "you", "your", "our", "are", "will", "have", "has",
    "this", "that", "from", "all", "who", "their", "they", "them", "but", "not", "can",
    "any", "may", "out", "via", "per", "off", "use", "used", "using", "into", "over",
    "experience", "experienced", "team", "teams", "work", "working", "role", "roles",
    "company", "companies", "looking", "join", "ability", "able", "strong", "years",
    "year", "including", "include", "includes", "such", "across", "within", "while",
    "about", "more", "most", "well", "also", "plus", "etc", "job", "candidate", "candidates",
    "requirements", "responsibilities", "qualifications", "preferred", "required", "must",
    "should", "would", "like", "want", "need", "needs", "new", "high", "level", "based",
    "part", "full", "time", "day", "days", "week", "weeks", "month", "months", "skills",
    "knowledge", "understanding", "environment", "world", "people", "great", "good", "help",
  ].map((w) => w.toLowerCase())
);

// ── Small helpers ───────────────────────────────────────────────────────────

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

const METRIC_RE = /(\d+(\.\d+)?\s?%|\$\s?\d|\b\d{1,3}(,\d{3})+\b|\b\d+\s?(k|m|bn|x|×)\b|\b\d+\+?\b)/i;
const PRONOUN_RE = /\b(i|me|my|we|our|us)\b/i;

function hasMetric(text: string): boolean {
  return METRIC_RE.test(text);
}

function startsWithWeakOpener(bullet: string): boolean {
  const b = bullet.trim().toLowerCase();
  return WEAK_OPENERS.some((w) => b.startsWith(w));
}

function firstWord(bullet: string): string {
  const m = bullet.trim().toLowerCase().match(/[a-z][a-z'-]*/);
  return m ? m[0] : "";
}

function allBullets(cv: ResumeData): string[] {
  const out: string[] = [];
  for (const e of cv.experience) {
    for (const b of e.description) {
      if (b && b.trim()) out.push(b.trim());
    }
  }
  return out;
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z+#.]{2,}/g) ?? []).filter(
    (t) => t.length >= 3 && !STOPWORDS.has(t)
  );
}

// ── Category checks ─────────────────────────────────────────────────────────

function scoreCompleteness(cv: ResumeData): CategoryScore {
  const pi = cv.personalInfo;
  const checks: { ok: boolean; weight: number; problem?: Omit<LocalProblem, "category"> }[] = [
    {
      ok: Boolean(pi.name.trim()),
      weight: 3,
      problem: { id: "completeness:name", severity: "high", title: "Add your name", detail: "Your CV has no name in the header.", scoreImpact: 6 },
    },
    {
      ok: Boolean(pi.title.trim()),
      weight: 3,
      problem: { id: "completeness:title", severity: "high", title: "Add a target job title", detail: "A headline title tells ATS and recruiters which role you're aiming at.", scoreImpact: 6 },
    },
    {
      ok: Boolean(pi.email.trim()),
      weight: 3,
      problem: { id: "completeness:email", severity: "high", title: "Add a contact email", detail: "Recruiters can't reach you without one.", scoreImpact: 6 },
    },
    {
      ok: Boolean(pi.phone.trim()),
      weight: 1,
      problem: { id: "completeness:phone", severity: "low", title: "Add a phone number", detail: "Optional, but most recruiters expect one.", scoreImpact: 2 },
    },
    {
      ok: Boolean(pi.location.trim()),
      weight: 1,
      problem: { id: "completeness:location", severity: "low", title: "Add your location", detail: "City and country help with role matching.", scoreImpact: 2 },
    },
    {
      ok: cv.experience.length > 0,
      weight: 4,
      problem: { id: "completeness:experience", severity: "high", title: "Add work experience", detail: "Experience is the core of any CV — add at least one role.", scoreImpact: 12, fix: { kind: "ai", instruction: "Interview me about my most recent job and add it to my CV — company, role, dates, and 2-3 achievement bullets." } },
    },
    {
      ok: cv.education.length > 0,
      weight: 2,
      problem: { id: "completeness:education", severity: "medium", title: "Add education", detail: "Add at least one degree or qualification.", scoreImpact: 5 },
    },
    {
      ok: cv.skills.length >= 5,
      weight: 2,
      problem: { id: "completeness:skills", severity: "medium", title: "Add more skills", detail: `You have ${cv.skills.length} skill${cv.skills.length === 1 ? "" : "s"} — aim for at least 5–8.`, scoreImpact: 5, fix: { kind: "ai", instruction: "Suggest and add the most relevant skills for my target role, drawn from my experience. Don't invent skills I haven't shown." } },
    },
    {
      ok: !isPlaceholderSummary(cv.summary),
      weight: 2,
      problem: { id: "completeness:summary", severity: "medium", title: "Write a professional summary", detail: "A 2-3 sentence summary frames your story up top.", scoreImpact: 6, fix: { kind: "ai", instruction: "Write me a strong 2-3 sentence professional summary based on my experience and target role." } },
    },
  ];

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const passedWeight = checks.reduce((s, c) => s + (c.ok ? c.weight : 0), 0);
  const problems = checks
    .filter((c) => !c.ok && c.problem)
    .map((c) => ({ ...(c.problem as Omit<LocalProblem, "category">), category: "completeness" as const }));

  return { category: "completeness", label: "Completeness", score: clamp((passedWeight / totalWeight) * 100), weight: 0, problems };
}

function scoreImpact(cv: ResumeData): CategoryScore {
  const bullets = allBullets(cv);
  const problems: LocalProblem[] = [];

  if (cv.experience.length === 0 || bullets.length === 0) {
    return {
      category: "impact",
      label: "Impact",
      score: 25,
      weight: 0,
      problems: [
        {
          id: "impact:no-bullets",
          category: "impact",
          severity: "high",
          title: "Add achievement bullets",
          detail: "Describe what you did and what changed because of it — that's where impact lives.",
          scoreImpact: 12,
          fix: { kind: "ai", instruction: "Help me write 2-3 strong achievement bullets for each of my roles, based on what I actually did." },
        },
      ],
    };
  }

  const quantified = bullets.filter(hasMetric).length;
  const quantifiedRatio = quantified / bullets.length;
  const weakBullets = bullets.filter(startsWithWeakOpener).length;
  const weakRatio = weakBullets / bullets.length;

  let score = 100;
  score -= (1 - quantifiedRatio) * 45;
  score -= weakRatio * 35;

  if (quantifiedRatio < 0.5) {
    problems.push({
      id: "impact:quantify",
      category: "impact",
      severity: quantifiedRatio < 0.25 ? "high" : "medium",
      title: "Quantify your impact",
      detail: `Only ${quantified} of ${bullets.length} bullets have a number. Metrics (%, $, scale) make achievements credible.`,
      scoreImpact: quantifiedRatio < 0.25 ? 12 : 7,
      fix: { kind: "ai", instruction: "Add concrete metrics to my experience bullets where the numbers exist — %, $, scale, time saved. Never invent a number; if a bullet needs one you don't have, ask me." },
    });
  }
  if (weakBullets > 0) {
    problems.push({
      id: "impact:weak-verbs",
      category: "impact",
      severity: weakRatio > 0.3 ? "high" : "medium",
      title: `Strengthen ${weakBullets} weak bullet${weakBullets === 1 ? "" : "s"}`,
      detail: 'Some bullets open with weak phrases like "responsible for" or "helped". Lead with a strong action verb.',
      scoreImpact: weakRatio > 0.3 ? 9 : 5,
      fix: { kind: "ai", instruction: 'Rewrite my experience bullets that open with weak phrases ("responsible for", "worked on", "helped", "assisted") so each leads with a strong action verb and the impact. Keep all facts the same.' },
    });
  }

  return { category: "impact", label: "Impact", score: clamp(score), weight: 0, problems };
}

function scoreClarity(cv: ResumeData): CategoryScore {
  const bullets = allBullets(cv);
  const summary = isPlaceholderSummary(cv.summary) ? "" : cv.summary;
  const texts = [...bullets, summary].filter(Boolean);
  const problems: LocalProblem[] = [];
  let score = 100;

  // First-person pronouns (resume voice drops them).
  const pronounHits = texts.filter((t) => PRONOUN_RE.test(t)).length;
  if (pronounHits > 0) {
    score -= 15;
    problems.push({
      id: "clarity:pronouns",
      category: "clarity",
      severity: "medium",
      title: "Drop first-person pronouns",
      detail: 'Resume voice omits "I", "my", and "we". Found them in ' + pronounHits + " line" + (pronounHits === 1 ? "" : "s") + ".",
      scoreImpact: 5,
      fix: { kind: "ai", instruction: "Remove first-person pronouns (I, me, my, we, our) from my summary and all my bullets — rewrite in clean resume voice." },
    });
  }

  // Buzzwords / clichés.
  const lowerAll = texts.join(" \n ").toLowerCase();
  const foundBuzz = BUZZWORDS.filter((b) => lowerAll.includes(b));
  if (foundBuzz.length > 0) {
    score -= Math.min(30, foundBuzz.length * 10);
    problems.push({
      id: "clarity:buzzwords",
      category: "clarity",
      severity: foundBuzz.length > 2 ? "medium" : "low",
      title: `Replace ${foundBuzz.length} cliché${foundBuzz.length === 1 ? "" : "s"}`,
      detail: `Found: ${foundBuzz.slice(0, 4).join(", ")}. Swap clichés for specific, concrete language.`,
      scoreImpact: 4,
      fix: { kind: "ai", instruction: `Replace clichés and buzzwords in my CV (${foundBuzz.join(", ")}) with specific, concrete language grounded in what I actually did.` },
    });
  }

  // Over-long / run-on bullets.
  const longBullets = bullets.filter((b) => b.length > 240).length;
  if (longBullets > 0) {
    score -= Math.min(25, longBullets * 8);
    problems.push({
      id: "clarity:long-bullets",
      category: "clarity",
      severity: "low",
      title: `Tighten ${longBullets} long bullet${longBullets === 1 ? "" : "s"}`,
      detail: "Long, run-on bullets lose the reader. Aim for one punchy line each.",
      scoreImpact: 4,
      fix: { kind: "ai", instruction: "Tighten my longest experience bullets to one punchy line each — lead with impact, cut filler, keep every fact." },
    });
  }

  // Repetition: same opening verb across 3+ bullets.
  const openers = new Map<string, number>();
  for (const b of bullets) {
    const w = firstWord(b);
    if (w) openers.set(w, (openers.get(w) ?? 0) + 1);
  }
  const repeated = [...openers.entries()].filter(([, n]) => n >= 3).map(([w]) => w);
  if (repeated.length > 0) {
    score -= 12;
    problems.push({
      id: "clarity:repetition",
      category: "clarity",
      severity: "low",
      title: "Vary your opening verbs",
      detail: `"${repeated[0]}" opens ${openers.get(repeated[0])} bullets. Variety reads stronger.`,
      scoreImpact: 4,
      fix: { kind: "ai", instruction: "My experience bullets repeat the same opening verbs. Rewrite them to vary the action verbs while keeping the facts." },
    });
  }

  return { category: "clarity", label: "Clarity", score: clamp(score), weight: 0, problems };
}

function scoreLength(cv: ResumeData): CategoryScore {
  const words = resumeToText(cv).split(/\s+/).filter(Boolean).length;
  const problems: LocalProblem[] = [];
  let score = 100;

  if (words < 250) {
    score = Math.max(35, Math.round((words / 250) * 80));
    problems.push({
      id: "length:thin",
      category: "length",
      severity: words < 120 ? "high" : "medium",
      title: "Your CV looks thin",
      detail: `About ${words} words. A strong CV runs ~350–800 words — add detail to your roles.`,
      scoreImpact: 8,
      fix: { kind: "ai", instruction: "My CV is too thin. Interview me to flesh out my roles with more achievement bullets and detail." },
    });
  } else if (words > 1100) {
    score = Math.max(55, 100 - Math.round((words - 1100) / 40));
    problems.push({
      id: "length:long",
      category: "length",
      severity: "medium",
      title: "Your CV runs long",
      detail: `About ${words} words — over two pages. Trim older roles to the strongest 1-2 bullets.`,
      scoreImpact: 6,
      fix: { kind: "ai", instruction: "My CV is too long. Trim it toward 1-2 pages: cut older-role bullets to the strongest 1-2 and remove filler, keeping all roles." },
    });
  }

  return { category: "length", label: "Length", score: clamp(score), weight: 0, problems };
}

function scoreAts(cv: ResumeData, jobMatch?: { coverage: number; missing: string[] }): CategoryScore {
  const problems: LocalProblem[] = [];
  let score = 100;

  if (cv.skills.length < 6) {
    score -= 22;
    problems.push({
      id: "ats:skills",
      category: "ats",
      severity: cv.skills.length < 3 ? "high" : "medium",
      title: "Add a fuller skills list",
      detail: "ATS systems match on a Skills section. List 8–15 role-relevant hard skills.",
      scoreImpact: 8,
      fix: { kind: "ai", instruction: "Build out my Skills section with the hard skills most relevant to my target role, drawn from my experience. Don't invent skills I haven't shown." },
    });
  }
  if (isPlaceholderSummary(cv.summary)) {
    score -= 12;
    // (summary problem already raised under completeness; keep ATS score effect only)
  }
  if (!cv.personalInfo.email.trim()) {
    score -= 12;
  }
  if (cv.education.length === 0) {
    score -= 8;
  }

  if (jobMatch) {
    score -= Math.round((1 - jobMatch.coverage) * 30);
  }

  return { category: "ats", label: "ATS & Keywords", score: clamp(score), weight: 0, problems };
}

/** Job-match only exists when a JD is attached. Returns null otherwise. */
function scoreJobMatch(
  cv: ResumeData,
  opts: LocalScoreOptions
): { category: CategoryScore; coverage: number; missing: string[] } | null {
  const jd = (opts.jobText ?? "").trim();
  if (jd.length < 40) return null;

  const cvText = (resumeToText(cv) + " " + (opts.jobTitle ?? "")).toLowerCase();
  // Rank JD tokens by frequency, keep the most salient ~30.
  const freq = new Map<string, number>();
  for (const t of tokenize(jd)) freq.set(t, (freq.get(t) ?? 0) + 1);
  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([t]) => t);
  if (ranked.length === 0) return null;

  const present = ranked.filter((t) => cvText.includes(t));
  const missing = ranked.filter((t) => !cvText.includes(t)).slice(0, 8);
  const coverage = present.length / ranked.length;

  const problems: LocalProblem[] = [];
  if (coverage < 0.85 && missing.length > 0) {
    problems.push({
      id: "jobMatch:missing-keywords",
      category: "jobMatch",
      severity: coverage < 0.5 ? "high" : "medium",
      title: `Cover ${missing.length} more keyword${missing.length === 1 ? "" : "s"} from the job`,
      detail: `Missing from your CV: ${missing.join(", ")}.`,
      scoreImpact: coverage < 0.5 ? 12 : 7,
      fix: {
        kind: "ai",
        instruction: `Weave these keywords from the job post into my CV where my real experience supports them — never claim anything I didn't do: ${missing.join(", ")}.`,
      },
    });
  }

  return {
    category: { category: "jobMatch", label: "Job match", score: clamp(coverage * 100), weight: 0, problems },
    coverage,
    missing,
  };
}

// ── Goal weighting ──────────────────────────────────────────────────────────

function baseWeight(cat: ScoreCategory): number {
  switch (cat) {
    case "impact": return 1.0;
    case "ats": return 1.0;
    case "clarity": return 0.8;
    case "length": return 0.6;
    case "completeness": return 1.0;
    case "jobMatch": return 1.2;
  }
}

function goalMultiplier(cat: ScoreCategory, goal: GoalWeighting): number {
  if (goal === "ats") {
    if (cat === "ats") return 1.6;
    if (cat === "completeness") return 1.2;
    if (cat === "impact") return 0.8;
    if (cat === "clarity") return 0.7;
    return 1.0;
  }
  if (goal === "recruiter") {
    if (cat === "impact") return 1.5;
    if (cat === "clarity") return 1.3;
    if (cat === "ats") return 0.7;
    return 1.0;
  }
  return 1.0; // both
}

function bandFor(overall: number): ScoreBand {
  if (overall >= 85) return "great";
  if (overall >= 75) return "strong";
  if (overall >= 60) return "fair";
  if (overall >= 45) return "weak";
  return "poor";
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute the full live score for a CV. Pure and synchronous — safe to call on
 * every keystroke and inside React useMemo.
 */
export function computeLocalScore(cv: ResumeData, opts: LocalScoreOptions = {}): LocalScoreResult {
  const goal = opts.goal ?? "both";

  const jm = scoreJobMatch(cv, opts);
  const categories: CategoryScore[] = [
    scoreCompleteness(cv),
    scoreImpact(cv),
    scoreClarity(cv),
    scoreLength(cv),
    scoreAts(cv, jm ? { coverage: jm.coverage, missing: jm.missing } : undefined),
  ];
  if (jm) categories.push(jm.category);

  // Apply goal-derived weights and compute the weighted overall.
  let weightedSum = 0;
  let weightTotal = 0;
  for (const c of categories) {
    c.weight = baseWeight(c.category) * goalMultiplier(c.category, goal);
    weightedSum += c.score * c.weight;
    weightTotal += c.weight;
  }
  const overall = weightTotal > 0 ? clamp(weightedSum / weightTotal) : 0;

  return {
    overall,
    band: bandFor(overall),
    categories,
    hasJobContext: Boolean(jm),
  };
}

/** All problems across categories, highest-impact first — the panel's list. */
export function flattenProblems(result: LocalScoreResult): LocalProblem[] {
  return result.categories
    .flatMap((c) => c.problems)
    .sort((a, b) => b.scoreImpact - a.scoreImpact);
}

export const BAND_LABEL: Record<ScoreBand, string> = {
  great: "Great",
  strong: "Strong",
  fair: "Fair",
  weak: "Needs work",
  poor: "Just starting",
};

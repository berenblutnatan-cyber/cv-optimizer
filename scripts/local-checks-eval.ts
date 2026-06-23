// Unit eval for the pure live-score engine (lib/optimizer/localChecks.ts).
// Fully offline — the engine does no I/O. Fails on the OLD tree because the
// module didn't exist, so it's a real regression gate for the Score panel.
//
// Run: npx tsx scripts/local-checks-eval.ts   (or: npm run eval:localchecks)

import { computeLocalScore, flattenProblems } from "@/lib/optimizer/localChecks";
import { WEAK_CV, STRONG_CV, SAMPLE_JD } from "@/evals/local-checks-fixtures";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`${GREEN}✓${RESET} ${name}`);
  } else {
    failures++;
    console.log(`${RED}✗ ${name}${RESET}${detail ? `  — ${detail}` : ""}`);
  }
}

// 1. Weak CV: weak-verb bullets are flagged.
const weak = computeLocalScore(WEAK_CV);
const weakIds = new Set(flattenProblems(weak).map((p) => p.id));
check("weak openers flag impact:weak-verbs", weakIds.has("impact:weak-verbs"));

// 2. Weak CV has no numbers -> quantify problem.
check("zero-metric CV flags impact:quantify", weakIds.has("impact:quantify"));

// 3. Placeholder summary is detected.
check("placeholder summary flags completeness:summary", weakIds.has("completeness:summary"));

// 4. Job context presence toggles the jobMatch category.
const noJd = computeLocalScore(STRONG_CV);
check("no JD -> hasJobContext is false", noJd.hasJobContext === false);
const withJd = computeLocalScore(STRONG_CV, { jobText: SAMPLE_JD, jobTitle: "Product Analyst" });
check("JD attached -> hasJobContext is true", withJd.hasJobContext === true);
const jobMatchCat = withJd.categories.find((c) => c.category === "jobMatch");
check(
  "JD attached -> jobMatch coverage < 100",
  Boolean(jobMatchCat) && jobMatchCat!.score < 100,
  jobMatchCat ? `score=${jobMatchCat.score}` : "missing category"
);

// 5. Goal weighting actually changes the overall.
const ats = computeLocalScore(WEAK_CV, { goal: "ats" }).overall;
const recruiter = computeLocalScore(WEAK_CV, { goal: "recruiter" }).overall;
check("goal ats vs recruiter -> different overall", ats !== recruiter, `ats=${ats} recruiter=${recruiter}`);

// 6. Determinism: identical input -> identical overall.
const a = computeLocalScore(STRONG_CV, { jobText: SAMPLE_JD }).overall;
const b = computeLocalScore(STRONG_CV, { jobText: SAMPLE_JD }).overall;
check("deterministic overall", a === b, `a=${a} b=${b}`);

// 7. Sanity: a strong CV scores higher than a weak one.
check("strong CV outscores weak CV", noJd.overall > weak.overall, `strong=${noJd.overall} weak=${weak.overall}`);

// 8. Problem ids are stable (no Date.now()/random leaking into ids).
const ids1 = flattenProblems(computeLocalScore(WEAK_CV)).map((p) => p.id).join(",");
const ids2 = flattenProblems(computeLocalScore(WEAK_CV)).map((p) => p.id).join(",");
check("problem ids stable across runs", ids1 === ids2);

console.log(failures === 0 ? `\n${GREEN}All local-checks assertions passed.${RESET}` : `\n${RED}${failures} assertion(s) failed.${RESET}`);
process.exit(failures === 0 ? 0 : 1);

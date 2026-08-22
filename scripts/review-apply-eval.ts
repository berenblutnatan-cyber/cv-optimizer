// Apply-path eval: replay a REAL captured review through the exact code the
// "Apply all" button runs, and prove every edit lands on the intended line.
//
// Offline and deterministic — no LLM call, so it can gate every commit.
//
// This is the suite that guards the failure that would actually hurt a user:
// an Apply button that edits the WRONG bullet. Each cut shifts every later
// index in that entry, so the batch derives each tool call from the CV as it
// stands after the previous edit (buildToolCall -> resolveRef -> content
// hash), never from the indices frozen at review time.
//
// Fails on the OLD tree: none of these modules existed, and the only edit tool
// was update_experience, which replaces a whole bullet array.
//
// Run: npx tsx scripts/review-apply-eval.ts   (npm run eval:review-apply)

import { applyCvToolCall } from "@/lib/chat/cvTools";
import { buildToolCall, isStale, hashText } from "@/lib/review/targetRef";
import { reviewFromModel, mergeReviewBlocks } from "@/lib/review/fromModel";
import type { Advice } from "@/lib/review/types";
import type { ResumeData } from "@/types/resume";
import { OVERLONG_CV, REVIEW_RESPONSE, REVIEW_OVERFLOW_LINES } from "@/evals/review-fixtures";

const RED = "\x1b[31m", GREEN = "\x1b[32m", RESET = "\x1b[0m";
let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`${GREEN}✓${RESET} ${name}${detail ? `  (${detail})` : ""}`);
  else { failures++; console.log(`${RED}✗ ${name}${RESET}${detail ? `  — ${detail}` : ""}`); }
}

const cv0 = OVERLONG_CV;
const advice: Advice[] = REVIEW_RESPONSE.advice;
const actionable = advice.filter((a) => a.verdict !== "keep");
const bulletsOf = (d: ResumeData) => d.experience.flatMap((e) => e.description);

// ── 1. the captured review is well-formed ───────────────────────────────────
check("fixture carries advice", advice.length > 0, `n=${advice.length}`);
check("fixture honored the cut budget",
  advice.filter((a) => a.verdict === "cut").length >= REVIEW_OVERFLOW_LINES,
  `cuts=${advice.filter((a) => a.verdict === "cut").length} budget=${REVIEW_OVERFLOW_LINES}`);
check("every bullet target still resolves against the CV",
  advice.filter((a) => a.target.kind === "bullet").every((a) => !isStale(cv0, a)));
check("every stored hash matches the real line",
  advice.filter((a) => a.target.kind === "bullet").every((a) => a.target.hash === hashText(a.before ?? "")));
check("no cut targets education", !advice.some((a) => a.verdict === "cut" && a.target.section === "education"));
check("every rewrite carries replacement text", 
  advice.filter((a) => a.verdict === "rewrite").every((a) => Boolean(a.after) && a.after !== a.before));

// ── 2. replay the batch exactly as applyAllAdvice does ──────────────────────
const intendedCuts = actionable.filter((a) => a.verdict === "cut").map((a) => a.before!);
const intendedRewrites = actionable
  .filter((a) => a.verdict === "rewrite" && a.target.kind === "bullet")
  .map((a) => ({ before: a.before!, after: a.after! }));

let cv = cv0;
let applied = 0;
for (const a of actionable) {
  if (isStale(cv, a)) continue;
  const call = buildToolCall(cv, a);
  if (!call) continue;
  const next = applyCvToolCall(cv, call.name, call.input);
  if (next !== cv) { applied++; cv = next; }
}

const before = bulletsOf(cv0), after = bulletsOf(cv);

check("every actionable item applied", applied === actionable.length, `${applied}/${actionable.length}`);
check("every intended cut line is gone", intendedCuts.every((t) => !after.includes(t)), `${intendedCuts.length} cuts`);
check("every rewrite landed verbatim", intendedRewrites.every((r) => after.includes(r.after)), `${intendedRewrites.length} rewrites`);
check("no rewritten original survives", intendedRewrites.every((r) => !after.includes(r.before)));
check("bullet count dropped by exactly the cut count",
  before.length - after.length === intendedCuts.length, `${before.length}->${after.length}, cuts=${intendedCuts.length}`);

// THE misfire check: anything the review did not name must be byte-identical.
check("NO unnamed line was altered", (() => {
  const touched = new Set([...intendedCuts, ...intendedRewrites.map((r) => r.before)]);
  return before.filter((b) => !touched.has(b)).every((b) => after.includes(b));
})());

check("no entry left with zero bullets", cv.experience.every((e) => e.description.length > 0));
check("education untouched", JSON.stringify(cv.education) === JSON.stringify(cv0.education));
check("contact details untouched", JSON.stringify(cv.personalInfo) === JSON.stringify(cv0.personalInfo));
check("skills untouched", JSON.stringify(cv.skills) === JSON.stringify(cv0.skills));
check("summary was rewritten", cv.summary !== cv0.summary && cv.summary.length > 20);
check("input CV never mutated", JSON.stringify(bulletsOf(OVERLONG_CV)) === JSON.stringify(before));

// ── 3. applying twice is a no-op (idempotent) ───────────────────────────────
let cv2 = cv;
for (const a of actionable) {
  if (isStale(cv2, a)) continue;
  const call = buildToolCall(cv2, a);
  if (!call) continue;
  cv2 = applyCvToolCall(cv2, call.name, call.input);
}
check("re-applying the same advice changes nothing",
  JSON.stringify(bulletsOf(cv2)) === JSON.stringify(after),
  "stale refs are refused, not re-run");

// ── 4. the multi-block merge that the live model actually needs ─────────────
const merged = mergeReviewBlocks([
  { score: 76, readsAs: "You read as X." },
  { score: 99, readsAs: "ignored duplicate", gap: "The gap." },
  { strengthTitles: ["A"], strengthEvidence: ["ev A"] },
  { strengthTitles: ["B"], strengthEvidence: ["ev B"] },
  { verdicts: [{ section: "experience", index: 0, bulletIndex: 0, verdict: "cut", title: "T", reason: "R", scoreImpact: 4 }] },
]);
check("merge keeps the FIRST scalar", merged.score === 76 && merged.readsAs === "You read as X.");
check("merge picks up a scalar from a later block", merged.gap === "The gap.");
check("merge concatenates arrays across blocks",
  Array.isArray(merged.strengthTitles) && (merged.strengthTitles as string[]).length === 2);
const conv = reviewFromModel(cv0, merged);
check("merged blocks convert into real advice", conv.review.advice.length === 1);
check("merged strengths pair title with evidence",
  conv.review.strengths.length === 2 && conv.review.strengths[0].evidence === "ev A");

// ── 5. hallucinated / sacred targets are dropped, not surfaced ──────────────
const hostile = reviewFromModel(cv0, {
  score: 50, readsAs: "x",
  strengthTitles: ["a", "b"], strengthEvidence: ["e1", "e2"],
  verdicts: [
    { section: "experience", index: 99, bulletIndex: 0, verdict: "cut", title: "ghost", reason: "r", scoreImpact: 5 },
    { section: "experience", index: 0, bulletIndex: 99, verdict: "cut", title: "ghost2", reason: "r", scoreImpact: 5 },
    { section: "education", index: 0, bulletIndex: 0, verdict: "cut", title: "cut a degree", reason: "r", scoreImpact: 5 },
    { section: "experience", index: 0, bulletIndex: 1, verdict: "rewrite", title: "no text", reason: "r", scoreImpact: 5 },
    { section: "nonsense", index: 0, bulletIndex: 0, verdict: "cut", title: "bad section", reason: "r", scoreImpact: 5 },
  ],
});
check("out-of-range entry dropped", hostile.stats.droppedUnresolved >= 1);
check("out-of-range bullet dropped", hostile.stats.droppedUnresolved >= 2, `dropped=${hostile.stats.droppedUnresolved}`);
check("education cut dropped as sacred", hostile.stats.droppedSacred === 1);
check("rewrite with no replacement dropped", hostile.stats.droppedNoReplacement === 1);
check("nothing hostile reached the advice list", hostile.review.advice.length === 0,
  JSON.stringify(hostile.review.advice.map((a) => a.id)));

// ── 6. cutting an entry down to its last line is refused ────────────────────
const oneBullet: ResumeData = {
  ...cv0,
  experience: [{ ...cv0.experience[0], description: ["The only evidence for this role"] }],
};
const lastLine = reviewFromModel(oneBullet, {
  score: 50, readsAs: "x", strengthTitles: ["a", "b"], strengthEvidence: ["e1", "e2"],
  verdicts: [{ section: "experience", index: 0, bulletIndex: 0, verdict: "cut", title: "cut it", reason: "r", scoreImpact: 5 }],
});
check("cutting a role's ONLY bullet is refused", lastLine.stats.droppedWouldEmpty === 1 && lastLine.review.advice.length === 0);

console.log(failures === 0
  ? `\n${GREEN}All review apply-path assertions passed.${RESET}`
  : `\n${RED}${failures} assertion(s) failed.${RESET}`);
process.exit(failures === 0 ? 0 : 1);

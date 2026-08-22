// LocalProblem[] -> Advice[].
//
// Lets the free, instant, deterministic meter (computeLocalScore) and the Opus
// review render as ONE list instead of two competing panels. The local pass
// fills the panel in 0ms so the user is never staring at a spinner, and the AI
// advice merges in on top of it.

import type { LocalProblem, LocalScoreResult } from "@/lib/optimizer/localChecks";
import { flattenProblems } from "@/lib/optimizer/localChecks";
import type { Advice, Verdict } from "./types";

/** Local problems are document-level checks, so they map onto a few verdicts. */
function verdictFor(p: LocalProblem): Verdict {
  if (p.id.startsWith("length:long")) return "cut";
  if (p.category === "completeness") return "add";
  return "rewrite";
}

export function adviceFromLocal(result: LocalScoreResult): Advice[] {
  return flattenProblems(result).map((p) => ({
    id: `local:${p.id}`,
    source: "local" as const,
    // Deterministic checks describe the document, not one line — the fix
    // descriptor carries the exact target when there is one.
    target: { kind: "document" as const },
    verdict: verdictFor(p),
    category: p.category,
    severity: p.severity,
    title: p.title,
    reason: p.detail,
    scoreImpact: p.scoreImpact,
    fix: p.fix,
  }));
}

/**
 * Merge the instant local pass with the AI review. AI advice wins on id
 * collision (it's specific where the local check is general), and local advice
 * whose whole category the AI already covered line-by-line is dropped so the
 * user doesn't see "some bullets are weak" sitting above the actual list of
 * weak bullets.
 */
export function mergeAdvice(local: Advice[], ai: Advice[]): Advice[] {
  const aiIds = new Set(ai.map((a) => a.id));
  const aiTouchesBullets = ai.some((a) => a.target.kind === "bullet");

  const GENERALITIES = new Set(["local:impact:weak-verbs", "local:impact:quantify", "local:clarity:long-bullets"]);

  const keptLocal = local.filter((a) => {
    if (aiIds.has(a.id)) return false;
    if (aiTouchesBullets && GENERALITIES.has(a.id)) return false;
    return true;
  });

  return [...ai, ...keptLocal].sort((a, b) => b.scoreImpact - a.scoreImpact);
}

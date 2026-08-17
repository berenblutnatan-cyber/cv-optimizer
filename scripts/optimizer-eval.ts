// Optimizer deep-analysis eval. Runs every fixture in
// evals/optimizer-fixtures.ts through the EXACT pipeline the production
// /api/analyze route uses (lib/optimizer/pipeline.ts — parse → audit →
// rewrite → ground), then asserts:
//
//   1. Score bands hold (original + optimized) — rubric calibration.
//   2. GROUNDING (zero tolerance): every coverage evidence quote and every
//      suggestion `before` is literally present in the CV.
//   3. APPLIABILITY: grounded suggestions carry whitelisted patches that
//      apply non-noop via applyCvToolCall (verified again here from scratch).
//   4. COVERAGE: expected JD requirements are extracted; planted gaps come
//      back missing/partial.
//   5. DEPTH: suggestion count floors, rationales reference requirement ids.
//   6. STRUCTURAL PRESERVATION: no experience entry lost, personalInfo
//      untouched (replaces the old string-grep preservation checks).
//   7. Legacy fixture assertions on the projected v1 payload.
//
// Run: ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/optimizer-eval.ts
//
// Useful flags:
//   --only=<id>  Run a single fixture by id (skips the rest).
//   --json       Emit a machine-readable summary on stdout at the end.

import Anthropic from "@anthropic-ai/sdk";
import { runOptimizerPipeline } from "@/lib/optimizer/pipeline";
import { containsNormalized, groundingSources } from "@/lib/optimizer/ground";
import { applyCvToolCall } from "@/lib/chat/cvTools";
import type { DeepAnalysis } from "@/lib/optimizer/types";
import { FIXTURES, type OptimizerFixture } from "@/evals/optimizer-fixtures";

const args = new Set(process.argv.slice(2));
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? onlyArg.slice("--only=".length) : null;
const JSON_OUT = args.has("--json");

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is required.");
  process.exit(2);
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

type RunResult = {
  fixture: OptimizerFixture;
  ok: boolean;
  durationMs: number;
  score: number | null;
  optimizedScore: number | null;
  suggestionCount: number;
  groundedCount: number;
  failures: string[];
};

function assertPipelineQuality(fx: OptimizerFixture, a: DeepAnalysis, failures: string[]) {
  // 2. Grounding — zero tolerance. A quote may come from the raw upload OR
  // the parsed structure's rendering (the doc patches apply to) — the same
  // contract lib/optimizer/ground.ts enforces in production.
  const sources = groundingSources(fx.cvText, a.resumeData);
  const isQuoteGrounded = (q: string) => sources.some((src) => containsNormalized(src, q));
  for (const row of a.coverage) {
    for (const ev of row.evidence) {
      if (!isQuoteGrounded(ev.quote)) {
        failures.push(`ungrounded evidence quote for ${row.requirementId}: "${ev.quote.slice(0, 60)}"`);
      }
    }
  }
  for (const sug of a.suggestions) {
    if (sug.before !== null && !isQuoteGrounded(sug.before)) {
      failures.push(`ungrounded suggestion.before (${sug.id}): "${sug.before.slice(0, 60)}"`);
    }
  }

  // 3. Appliability — re-verify every grounded patch from the original data.
  for (const sug of a.suggestions) {
    if (!sug.grounded) continue;
    if (!sug.patch) {
      failures.push(`${sug.id} marked grounded but has no patch`);
      continue;
    }
    const applied = applyCvToolCall(a.resumeData, sug.patch.name, sug.patch.input);
    if (applied === a.resumeData) {
      failures.push(`${sug.id} patch (${sug.patch.name}) is a no-op against resumeData`);
    }
  }

  // 4. Requirement extraction + planted gaps.
  for (const pattern of fx.expectedRequirements ?? []) {
    if (!a.jdRequirements.some((r) => pattern.test(r.text))) {
      failures.push(`expected requirement not extracted: ${pattern}`);
    }
  }
  const covByReq = new Map(a.coverage.map((c) => [c.requirementId, c]));
  for (const gap of fx.expectedGaps ?? []) {
    const reqs = a.jdRequirements.filter((r) => gap.pattern.test(r.text));
    if (reqs.length === 0) continue; // extraction failure already reported above
    const ok = reqs.some((r) => {
      const row = covByReq.get(r.id);
      return row && (gap.statuses as string[]).includes(row.status);
    });
    if (!ok) {
      failures.push(
        `planted gap ${gap.pattern} not detected (expected ${gap.statuses.join("/")}, got ${reqs
          .map((r) => covByReq.get(r.id)?.status ?? "none")
          .join(",")})`
      );
    }
  }
  // Every requirement has a coverage row.
  for (const r of a.jdRequirements) {
    if (!covByReq.has(r.id)) failures.push(`requirement ${r.id} has no coverage row`);
  }

  // 5. Depth floors + rationale linkage.
  const minSuggestions = fx.minSuggestions ?? 10;
  if (a.suggestions.length < minSuggestions) {
    failures.push(`only ${a.suggestions.length} suggestions (< ${minSuggestions})`);
  }
  const grounded = a.suggestions.filter((s) => s.grounded);
  const minGrounded = fx.minGroundedSuggestions ?? 5;
  if (grounded.length < minGrounded) {
    failures.push(`only ${grounded.length} grounded/appliable suggestions (< ${minGrounded})`);
  }
  if (a.jdRequirements.length > 0) {
    const linked = a.suggestions.filter((s) => s.linkedRequirementIds.length > 0);
    if (linked.length < Math.min(3, a.suggestions.length)) {
      failures.push(`only ${linked.length} suggestions reference a requirement id`);
    }
  }
  for (const sug of a.suggestions) {
    if (!sug.rationale || sug.rationale.length < 20) {
      failures.push(`${sug.id} rationale too thin: "${sug.rationale.slice(0, 40)}"`);
    }
  }
  // Section critiques must exist and be substantive.
  if (a.sectionCritiques.length < 3) {
    failures.push(`only ${a.sectionCritiques.length} section critiques`);
  }

  // 6. Structural preservation (replaces prompt-begged string checks).
  if (!a.parseDegraded) {
    if (a.optimizedResumeData.experience.length < a.resumeData.experience.length) {
      failures.push(
        `experience entries lost: ${a.resumeData.experience.length} → ${a.optimizedResumeData.experience.length}`
      );
    }
    if (JSON.stringify(a.optimizedResumeData.personalInfo) !== JSON.stringify(a.resumeData.personalInfo)) {
      failures.push("personalInfo was modified by suggestions (contact immunity violated)");
    }
    if (a.parseDegraded === false && a.resumeData.experience.length === 0 && fx.cvText.length > 200) {
      failures.push("parse produced 0 experience entries for a real CV");
    }
  } else {
    failures.push("parse degraded on a well-formed fixture CV");
  }
}

async function runFixture(fx: OptimizerFixture): Promise<RunResult> {
  const t0 = Date.now();
  const failures: string[] = [];

  let analysis: DeepAnalysis;
  try {
    analysis = await runOptimizerPipeline(anthropic, {
      cvText: fx.cvText,
      jobTitle: fx.jobTitle,
      jobDescription: fx.jobDescription,
      companyName: fx.companyName,
      mode: fx.mode ?? "specific_role",
    });
  } catch (err) {
    return {
      fixture: fx,
      ok: false,
      durationMs: Date.now() - t0,
      score: null,
      optimizedScore: null,
      suggestionCount: 0,
      groundedCount: 0,
      failures: [`pipeline error: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  const score = analysis.scoreComparison.original.total;
  const optimizedScore = analysis.scoreComparison.optimized.total;

  // 1. Band checks.
  {
    const [lo, hi] = fx.originalBand;
    if (score < lo || score > hi) failures.push(`original score ${score} outside band [${lo}, ${hi}]`);
  }
  if (fx.optimizedBand) {
    const [lo, hi] = fx.optimizedBand;
    if (optimizedScore < lo || optimizedScore > hi) {
      failures.push(`optimized score ${optimizedScore} outside band [${lo}, ${hi}]`);
    }
  }

  // 2-6. Pipeline quality gates.
  assertPipelineQuality(fx, analysis, failures);

  // 7. Legacy fixture assertions against the projected v1 payload.
  for (const a of fx.assertions ?? []) {
    try {
      const r = a.check(analysis);
      if (r !== true) failures.push(`${a.name}: ${typeof r === "string" ? r : "failed"}`);
    } catch (err) {
      failures.push(`${a.name}: threw — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    fixture: fx,
    ok: failures.length === 0,
    durationMs: Date.now() - t0,
    score,
    optimizedScore,
    suggestionCount: analysis.suggestions.length,
    groundedCount: analysis.suggestions.filter((s) => s.grounded).length,
    failures,
  };
}

async function main() {
  const selected = ONLY ? FIXTURES.filter((f) => f.id === ONLY) : FIXTURES;
  if (selected.length === 0) {
    console.error(`No fixture matched --only=${ONLY}`);
    process.exit(2);
  }

  console.log(
    `${DIM}Running ${selected.length} fixture${selected.length === 1 ? "" : "s"} through the 3-pass pipeline…${RESET}\n`
  );

  // Sequential — each fixture is now 3 model calls (~60-90s); parallelism
  // would garble the log and bump into rate ceilings on full runs.
  const results: RunResult[] = [];
  for (const fx of selected) {
    process.stdout.write(`${DIM}▶ ${fx.id}…${RESET} `);
    const r = await runFixture(fx);
    results.push(r);
    if (r.ok) {
      console.log(
        `${GREEN}PASS${RESET} ${DIM}(${(r.durationMs / 1000).toFixed(1)}s, score ${r.score}→${r.optimizedScore}, ${r.suggestionCount} suggestions / ${r.groundedCount} appliable)${RESET}`
      );
    } else {
      console.log(
        `${RED}FAIL${RESET} ${DIM}(${(r.durationMs / 1000).toFixed(1)}s, score ${r.score ?? "?"}, ${r.suggestionCount} suggestions)${RESET}`
      );
      for (const f of r.failures) console.log(`    ${YELLOW}× ${f}${RESET}`);
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(
    `\n${passed === results.length ? GREEN : RED}${passed}/${results.length} passed${RESET}${failed ? `  ${RED}${failed} failed${RESET}` : ""}`
  );

  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        {
          passed,
          failed,
          total: results.length,
          results: results.map((r) => ({
            id: r.fixture.id,
            ok: r.ok,
            score: r.score,
            optimizedScore: r.optimizedScore,
            suggestions: r.suggestionCount,
            grounded: r.groundedCount,
            durationMs: r.durationMs,
            failures: r.failures,
          })),
        },
        null,
        2
      )
    );
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("eval crashed:", err);
  process.exit(2);
});

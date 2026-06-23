// Optimizer scoring eval. Runs every fixture in evals/optimizer-fixtures.ts
// through the EXACT prompt and model the production /api/analyze route uses,
// then asserts the resulting score falls in the expected band and behavioral
// invariants hold (LinkedIn URLs preserved, anti-collapse, score caps, etc).
//
// Run: ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/optimizer-eval.ts
//
// Useful flags:
//   --only=<id>  Run a single fixture by id (skips the rest).
//   --json       Emit a machine-readable summary on stdout at the end.

import Anthropic from "@anthropic-ai/sdk";
import { extractBalancedJson } from "@/lib/extractJson";
import { buildOptimizerPrompt, OPTIMIZER_SYSTEM_PROMPT } from "@/lib/optimizer/prompt";
import { FIXTURES, type AnalysisShape, type OptimizerFixture } from "@/evals/optimizer-fixtures";

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
  failures: string[];
  raw?: string;
};

async function runFixture(fx: OptimizerFixture): Promise<RunResult> {
  const t0 = Date.now();
  const failures: string[] = [];

  const { analysisPrompt } = buildOptimizerPrompt({
    cvText: fx.cvText,
    jobTitle: fx.jobTitle,
    jobDescription: fx.jobDescription,
    companyName: fx.companyName,
    mode: fx.mode ?? "specific_role",
  });

  let raw = "";
  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      system: OPTIMIZER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: analysisPrompt }],
    });
    if (response.stop_reason === "max_tokens") {
      return {
        fixture: fx,
        ok: false,
        durationMs: Date.now() - t0,
        score: null,
        optimizedScore: null,
        failures: ["model hit max_tokens — output truncated"],
      };
    }
    raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  } catch (err) {
    return {
      fixture: fx,
      ok: false,
      durationMs: Date.now() - t0,
      score: null,
      optimizedScore: null,
      failures: [`model error: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  const jsonText = extractBalancedJson(raw);
  if (!jsonText) {
    return {
      fixture: fx,
      ok: false,
      durationMs: Date.now() - t0,
      score: null,
      optimizedScore: null,
      failures: ["no JSON object in model output"],
      raw: raw.slice(0, 400),
    };
  }

  let analysis: AnalysisShape;
  try {
    analysis = JSON.parse(jsonText);
  } catch (err) {
    return {
      fixture: fx,
      ok: false,
      durationMs: Date.now() - t0,
      score: null,
      optimizedScore: null,
      failures: [`JSON parse error: ${err instanceof Error ? err.message : String(err)}`],
      raw: raw.slice(0, 400),
    };
  }

  const score = analysis.scoreComparison?.original?.total ?? analysis.overallScore ?? null;
  const optimizedScore = analysis.scoreComparison?.optimized?.total ?? null;

  // Band check on the original score
  if (score == null || !Number.isFinite(score)) {
    failures.push("score missing or non-numeric");
  } else {
    const [lo, hi] = fx.originalBand;
    if (score < lo || score > hi) {
      failures.push(`original score ${score} outside band [${lo}, ${hi}]`);
    }
  }

  // Band check on the optimized score (if asserted)
  if (fx.optimizedBand && optimizedScore != null) {
    const [lo, hi] = fx.optimizedBand;
    if (optimizedScore < lo || optimizedScore > hi) {
      failures.push(`optimized score ${optimizedScore} outside band [${lo}, ${hi}]`);
    }
  }

  // Custom assertions
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
    `${DIM}Running ${selected.length} fixture${selected.length === 1 ? "" : "s"} (model: claude-opus-4-8)…${RESET}\n`
  );

  // Sequential. Each call is ~6-15s and the rate ceiling is generous enough
  // that parallelism doesn't buy much for 6 fixtures, but trips message
  // ordering in the log.
  const results: RunResult[] = [];
  for (const fx of selected) {
    process.stdout.write(`${DIM}▶ ${fx.id}…${RESET} `);
    const r = await runFixture(fx);
    results.push(r);
    if (r.ok) {
      console.log(
        `${GREEN}PASS${RESET} ${DIM}(${(r.durationMs / 1000).toFixed(1)}s, score ${r.score}${r.optimizedScore != null ? `→${r.optimizedScore}` : ""})${RESET}`
      );
    } else {
      console.log(
        `${RED}FAIL${RESET} ${DIM}(${(r.durationMs / 1000).toFixed(1)}s, score ${r.score ?? "?"})${RESET}`
      );
      for (const f of r.failures) console.log(`    ${YELLOW}× ${f}${RESET}`);
      if (r.raw) console.log(`    ${DIM}raw: ${r.raw}…${RESET}`);
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

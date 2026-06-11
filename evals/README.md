# Optimizer scoring eval

A small golden-set harness that runs every fixture in [`optimizer-fixtures.ts`](optimizer-fixtures.ts) through the EXACT prompt and model the production `/api/analyze` route uses, then asserts:

1. The Phase-1 (original) score lands in the expected calibration band.
2. The optimized score honors the prompt's MAXIMUM IMPROVEMENT BY ORIGINAL SCORE TIER table.
3. Per-fixture behavioral invariants hold (LinkedIn URLs preserved verbatim, anti-collapse on multi-role merges, GPA/honors preserved, missing-credential gaps surfaced, no seniority-cap escape, etc).

## Why

The scoring rubric in [`lib/optimizer/prompt.ts`](../lib/optimizer/prompt.ts) is dense (650 lines of calibration tables, hard caps, and preservation rules). Every prompt edit and model swap risks moving the score distribution in ways that aren't visible until users complain. The eval catches that before it ships.

## Run

```bash
# Single fixture (fast iteration)
ANTHROPIC_API_KEY=sk-ant-... npm run eval:optimizer -- --only=pa-pa-direct-match

# Full suite (6 fixtures, ~2 minutes, ~$0.10 of Opus tokens)
ANTHROPIC_API_KEY=sk-ant-... npm run eval:optimizer

# Machine-readable output for CI
ANTHROPIC_API_KEY=sk-ant-... npm run eval:optimizer -- --json
```

The harness exits 0 on all-pass, 1 on any failure, 2 on a config/crash error.

## When to run it

- Before merging any change to `lib/optimizer/prompt.ts`.
- Before swapping the optimizer model (e.g., the next time we move from Opus 4.8 → 5).
- After dependency upgrades that touch the Anthropic SDK.

The suite is non-deterministic (no temperature setting in the route, model output varies). Bands are wide enough that a single rerun won't flap, but a real regression should fail consistently across 2 runs.

## Adding a fixture

Each fixture targets a specific calibration in the rubric — a band edge, a hard cap, a preservation rule. Keep CVs concise (under ~200 words) so eval cost stays bounded.

```ts
{
  id: "kebab-case-id",
  description: "What this fixture exercises",
  cvText: "...",
  jobTitle: "...",
  jobDescription: "...",
  originalBand: [55, 78],
  optimizedBand: [70, 90],
  assertions: [
    {
      name: "human-readable check name",
      check: (analysis) =>
        (analysis.optimizedCV ?? "").includes("expected-string") ||
        "failure message shown if check returns string",
    },
  ],
}
```

Assertions return `true` for pass or a string for fail (the string is shown in the eval output).

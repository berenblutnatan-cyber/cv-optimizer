// Unit eval for the one-page fit planner (lib/builder/autoFit.ts).
// Fully offline — the planner is pure arithmetic over a measurement.
//
// Fails on the OLD tree: the module didn't exist. What it replaced was
// SmartResumePreview's `handleAutoFit = () => { setFontLevel(2);
// setSpacingLevel(2) }`, and the assertions below are written to be exactly
// the ones that behavior fails — it drops to level 2 (under the legibility
// floor) no matter how small the overflow, and it never reports that content
// still has to be cut.
//
// Run: npx tsx scripts/autofit-eval.ts   (npm run eval:autofit)

import {
  planFit,
  nextFitStep,
  contentStatsFrom,
  FONT_FLOOR,
  SPACING_FLOOR,
  type FitDesign,
  type FitInput,
} from "@/lib/builder/autoFit";

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

const A4 = 1123;
const AVG_LINE = 14; // ~9.3px font at 1.5 line-height
const DESIGN: FitDesign = { fontLevel: 5, spacingLevel: 5, template: "ivy-league" };
const CONTENT = contentStatsFrom(A4, AVG_LINE, 18, 6);

const input = (overflowPx: number, design: FitDesign = DESIGN): FitInput => ({
  overflowPx,
  avgLinePx: AVG_LINE,
  design,
  content: CONTENT,
});

// ── 1. Already fits -> nothing to do ────────────────────────────────────────
const fits = planFit(input(0));
check("no overflow -> empty plan", fits.steps.length === 0 && fits.alreadyFits);
check("no overflow -> design untouched", fits.design.fontLevel === 5 && fits.design.spacingLevel === 5);
check("negative overflow -> empty plan", planFit(input(-40)).steps.length === 0);
check("no overflow -> nextFitStep is null", nextFitStep(input(0)) === null);

// ── 2. THE LEGIBILITY FLOOR (what the old auto-fit violated) ───────────────
// Old behavior: fontLevel 2 (8.7px) and spacingLevel 2 for ANY overflow.
const huge = planFit(input(2400)); // ~2 extra pages
check("huge overflow never breaches the font floor", huge.design.fontLevel >= FONT_FLOOR,
  `fontLevel=${huge.design.fontLevel}`);
check("huge overflow never breaches the spacing floor", huge.design.spacingLevel >= SPACING_FLOOR,
  `spacingLevel=${huge.design.spacingLevel}`);
check("huge overflow reports remaining content cuts", huge.linesToCut > 0 && !huge.fitsWithDesignAlone,
  `linesToCut=${huge.linesToCut}`);

// every level from every starting point respects the floors
let floorOk = true;
for (let f = 1; f <= 10; f++) {
  for (let sp = 1; sp <= 10; sp++) {
    for (const over of [10, 120, 600, 3000]) {
      const p = planFit(input(over, { fontLevel: f, spacingLevel: sp, template: "ivy-league" }));
      // Never push a level DOWN past the floor; a CV already below it stays put.
      if (p.design.fontLevel < Math.min(f, FONT_FLOOR)) floorOk = false;
      if (p.design.spacingLevel < Math.min(sp, SPACING_FLOOR)) floorOk = false;
    }
  }
}
check("floors hold across all 400 start states x overflows", floorOk);

// ── 3. Small overflow spends the CHEAPEST lever only ───────────────────────
const small = planFit(input(25));
check("small overflow uses one spacing step", small.steps.length === 1 && small.steps[0].kind === "spacing",
  JSON.stringify(small.steps.map((s) => s.kind)));
check("small overflow does NOT shrink the font", small.design.fontLevel === 5,
  `fontLevel=${small.design.fontLevel}`);
check("small overflow needs no content cuts", small.linesToCut === 0 && small.fitsWithDesignAlone);
// This is the assertion the old one-shot auto-fit fails outright:
check("small overflow does not collapse to level 2 (old behavior)",
  small.design.fontLevel !== 2 && small.design.spacingLevel !== 2,
  `font=${small.design.fontLevel} spacing=${small.design.spacingLevel}`);

// ── 4. Spend order: whitespace, then type, then layout, then words ─────────
const mid = planFit(input(900));
const kinds = mid.steps.map((s) => s.kind);
const order = ["spacing", "font", "template", "content"];
const positions = kinds.map((k) => order.indexOf(k));
check("steps stay in cheapest-first order", positions.every((p, i) => i === 0 || p >= positions[i - 1]),
  kinds.join(" -> "));
check("content cuts always come last", kinds.indexOf("content") === -1 || kinds.indexOf("content") === kinds.length - 1);

// ── 5. Template swap is a lever, and is skippable ──────────────────────────
const withSwap = planFit({ ...input(2400), allowTemplateSwap: true });
check("template swap offered when design alone can't close it", withSwap.steps.some((s) => s.kind === "template"));
const noSwap = planFit({ ...input(2400), allowTemplateSwap: false });
check("template swap suppressed when disallowed", !noSwap.steps.some((s) => s.kind === "template"));
check("suppressing the swap means MORE content cuts", noSwap.linesToCut >= withSwap.linesToCut,
  `noSwap=${noSwap.linesToCut} withSwap=${withSwap.linesToCut}`);
const alreadyCompact = planFit(input(2400, { fontLevel: 5, spacingLevel: 5, template: "compact" }));
check("compact template is not swapped for itself", !alreadyCompact.steps.some((s) => s.kind === "template"));
const sidebar = planFit(input(2400, { fontLevel: 5, spacingLevel: 5, template: "modern-sidebar" }));
check("sidebar layouts are not swapped to a single column", !sidebar.steps.some((s) => s.kind === "template"));

// ── 6. The iterative loop CONVERGES (the old one-shot never checked) ───────
// Simulate: apply nextFitStep, subtract its estimated saving, measure again.
let simDesign: FitDesign = { ...DESIGN };
let remaining = 900;
let guard = 0;
const applied: string[] = [];
while (guard++ < 50) {
  const step = nextFitStep({ overflowPx: remaining, avgLinePx: AVG_LINE, design: simDesign, content: CONTENT });
  if (!step) break;
  applied.push(step.kind);
  remaining -= step.estPx;
  if (step.kind === "spacing") simDesign = { ...simDesign, spacingLevel: step.to };
  if (step.kind === "font") simDesign = { ...simDesign, fontLevel: step.to };
  if (step.kind === "template") simDesign = { ...simDesign, template: step.to };
  if (remaining <= 0) break;
}
check("iterative loop terminates", guard < 50, `iterations=${guard}`);
check("iterative loop respects the floors", simDesign.fontLevel >= FONT_FLOOR && simDesign.spacingLevel >= SPACING_FLOOR,
  `font=${simDesign.fontLevel} spacing=${simDesign.spacingLevel}`);
check("iterative loop closed the gap or ran out of design levers",
  remaining <= 0 || (simDesign.fontLevel === FONT_FLOOR && simDesign.spacingLevel === SPACING_FLOOR),
  `remaining=${Math.round(remaining)}`);

// nextFitStep returns null once design levers are spent -> caller must cut content
const spent = nextFitStep({
  overflowPx: 500, avgLinePx: AVG_LINE,
  design: { fontLevel: FONT_FLOOR, spacingLevel: SPACING_FLOOR, template: "compact" },
  content: CONTENT,
});
check("design levers exhausted -> nextFitStep null (hand off to content)", spent === null);

// ── 7. Cut budget is proportional to the overflow ──────────────────────────
const over1 = planFit(input(1400)).linesToCut;
const over2 = planFit(input(2800)).linesToCut;
check("bigger overflow demands more cuts", over2 > over1, `${over1} -> ${over2}`);
check("cut budget is a whole number of lines", Number.isInteger(over2) && over2 > 0);

// ── 8. Determinism ─────────────────────────────────────────────────────────
check("planFit is deterministic",
  JSON.stringify(planFit(input(900))) === JSON.stringify(planFit(input(900))));

console.log(
  failures === 0
    ? `\n${GREEN}All auto-fit assertions passed.${RESET}`
    : `\n${RED}${failures} assertion(s) failed.${RESET}`
);
process.exit(failures === 0 ? 0 : 1);

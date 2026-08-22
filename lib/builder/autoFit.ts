// One-page fitting: decide what to spend to close a measured overflow.
//
// REPLACES: SmartResumePreview's `handleAutoFit = () => { setFontLevel(2);
// setSpacingLevel(2) }` — which shrank every CV to 8px type whether it was two
// lines over or two pages over, and never checked whether it worked.
//
// Two ideas make this different:
//
//  1. MEASUREMENT IS AUTHORITATIVE. The px estimates below only ORDER the
//     steps and let the UI say "tighten spacing, cut 4 bullets" before the
//     user commits. They are deliberately conservative and they WILL drift
//     from the real CSS. Correctness comes from the caller applying one step,
//     re-measuring the live DOM, and asking for the next one (nextFitStep) —
//     never from trusting these numbers.
//
//  2. THERE IS A LEGIBILITY FLOOR. Design tightening stops at fontLevel 4
//     (~10px) and spacingLevel 3. Below that a printed CV stops being
//     readable, and shrinking further is a worse outcome than a second page.
//     Once the floors are reached, the remainder has to come out of CONTENT,
//     which the user gets to see and approve.
//
// Pure and deterministic — no DOM, no Date.now(), no Math.random().

// TemplateRegistryId (not TemplateRegistryId) so this module stays free of any
// "use client" import and can be reached from the server and the evals.
import { getTemplateEntry, type TemplateRegistryId } from "@/lib/templates/registry";

/** Below this the CV stops being readable in print. */
export const FONT_FLOOR = 4;
export const SPACING_FLOOR = 3;

/** density.ts: fontSize = 8 + (fontLevel-1) * (6/9) */
const PX_PER_FONT_LEVEL = 6 / 9;
/** density.ts: lineHeight = 1.1 + (spacingLevel-1) * (0.8/9) */
const LH_PER_SPACING_LEVEL = 0.8 / 9;
/** density.ts: sectionGap gains 30/9 px per level */
const SECTION_GAP_PER_LEVEL = 30 / 9;
/** density.ts: itemGap gains 7.5/9 px per level */
const ITEM_GAP_PER_LEVEL = 7.5 / 9;
/** density.ts: .a4-safe-area padding gains 14/9 mm per level, top AND bottom */
const MM_TO_PX = 96 / 25.4;
const SAFE_PAD_PX_PER_LEVEL = (14 / 9) * 2 * MM_TO_PX;

export interface ContentStats {
  /** Rendered text lines, from contentPx / avgLinePx. */
  lines: number;
  /** Total bullet items across the CV. */
  bullets: number;
  /** Visible sections (experience, education, skills, …). */
  sections: number;
}

export interface FitDesign {
  fontLevel: number;
  spacingLevel: number;
  template: TemplateRegistryId;
}

export type FitStep =
  | { kind: "spacing"; to: number; estPx: number; label: string }
  | { kind: "font"; to: number; estPx: number; label: string }
  | { kind: "template"; to: TemplateRegistryId; estPx: number; label: string }
  | { kind: "content"; lines: number; estPx: number; label: string };

export interface FitInput {
  /** Measured px past one page. <= 0 means it already fits. */
  overflowPx: number;
  /** Measured height of one rendered line. */
  avgLinePx: number;
  design: FitDesign;
  content: ContentStats;
  /** Allow swapping the template as a fit lever. Off when the user picked one. */
  allowTemplateSwap?: boolean;
}

export interface FitPlan {
  steps: FitStep[];
  /** Design the plan lands on if fully applied. */
  design: FitDesign;
  /** Lines that still have to come out of content afterwards. */
  linesToCut: number;
  /** True when design levers alone are estimated to close the gap. */
  fitsWithDesignAlone: boolean;
  /** True when nothing needs doing. */
  alreadyFits: boolean;
}

/** Estimated px reclaimed by dropping spacing ONE level. */
function spacingStepSaving(design: FitDesign, content: ContentStats): number {
  const fontSize = 8 + (design.fontLevel - 1) * PX_PER_FONT_LEVEL;
  return (
    content.lines * fontSize * LH_PER_SPACING_LEVEL +
    content.bullets * ITEM_GAP_PER_LEVEL +
    content.sections * SECTION_GAP_PER_LEVEL +
    SAFE_PAD_PX_PER_LEVEL
  );
}

/** Estimated px reclaimed by dropping font ONE level. */
function fontStepSaving(design: FitDesign, content: ContentStats): number {
  const lineHeight = 1.1 + (design.spacingLevel - 1) * LH_PER_SPACING_LEVEL;
  return content.lines * PX_PER_FONT_LEVEL * lineHeight;
}

/** A denser template that keeps the CV readable. */
function denserTemplate(current: TemplateRegistryId): TemplateRegistryId | null {
  if (current === "compact") return null;
  const entry = getTemplateEntry(current);
  // Sidebar/split layouts already absorb overflow into the rail; swapping them
  // for a single column usually makes things worse, so only move to compact
  // from single-column layouts.
  if (entry && (entry.layout === "sidebar" || entry.layout === "split")) return null;
  return "compact";
}

/**
 * The FULL plan, for showing the user what fitting will cost before they
 * agree to it. Spend order is cheapest-to-the-reader first: whitespace, then
 * type size, then layout, and only then their actual words.
 */
export function planFit(input: FitInput): FitPlan {
  const { overflowPx, avgLinePx, content, allowTemplateSwap = true } = input;
  const design: FitDesign = { ...input.design };

  if (overflowPx <= 0) {
    return { steps: [], design, linesToCut: 0, fitsWithDesignAlone: true, alreadyFits: true };
  }

  const steps: FitStep[] = [];
  let remaining = overflowPx;

  // 1. Whitespace — highest yield per unit of readability lost.
  while (remaining > 0 && design.spacingLevel > SPACING_FLOOR) {
    const saving = spacingStepSaving(design, content);
    design.spacingLevel -= 1;
    remaining -= saving;
    const last = steps[steps.length - 1];
    if (last && last.kind === "spacing") {
      last.to = design.spacingLevel;
      last.estPx += saving;
      last.label = `Tighten spacing to ${design.spacingLevel}`;
    } else {
      steps.push({
        kind: "spacing",
        to: design.spacingLevel,
        estPx: saving,
        label: `Tighten spacing to ${design.spacingLevel}`,
      });
    }
  }

  // 2. Type size — down to the legibility floor, never past it.
  while (remaining > 0 && design.fontLevel > FONT_FLOOR) {
    const saving = fontStepSaving(design, content);
    design.fontLevel -= 1;
    remaining -= saving;
    const last = steps[steps.length - 1];
    if (last && last.kind === "font") {
      last.to = design.fontLevel;
      last.estPx += saving;
      last.label = `Reduce text size to ${design.fontLevel}`;
    } else {
      steps.push({
        kind: "font",
        to: design.fontLevel,
        estPx: saving,
        label: `Reduce text size to ${design.fontLevel}`,
      });
    }
  }

  // 3. A denser layout, if the user hasn't pinned a template.
  if (remaining > 0 && allowTemplateSwap) {
    const swap = denserTemplate(design.template);
    if (swap) {
      // Conservative: a denser template is worth roughly one spacing level.
      const saving = spacingStepSaving(design, content);
      design.template = swap;
      remaining -= saving;
      steps.push({
        kind: "template",
        to: swap,
        estPx: saving,
        label: "Switch to the Compact layout",
      });
    }
  }

  // 4. Whatever is left has to come out of the content — and the user sees it.
  const linesToCut = remaining > 0 ? Math.max(1, Math.ceil(remaining / Math.max(avgLinePx, 1))) : 0;
  if (linesToCut > 0) {
    steps.push({
      kind: "content",
      lines: linesToCut,
      estPx: remaining,
      label: linesToCut === 1 ? "Cut 1 weak line" : `Cut ${linesToCut} weak lines`,
    });
  }

  return {
    steps,
    design,
    linesToCut,
    fitsWithDesignAlone: linesToCut === 0,
    alreadyFits: false,
  };
}

/**
 * The iterative half: given a FRESH measurement, what is the single next thing
 * to do? Returns null when it fits or when only content cuts remain. The
 * caller applies this, waits for the DOM to re-render, measures again, and
 * calls back in — which is why estimate drift can't accumulate into a wrong
 * result the way a one-shot plan would.
 */
export function nextFitStep(input: FitInput): FitStep | null {
  const { overflowPx, content } = input;
  const design = input.design;
  if (overflowPx <= 0) return null;

  if (design.spacingLevel > SPACING_FLOOR) {
    return {
      kind: "spacing",
      to: design.spacingLevel - 1,
      estPx: spacingStepSaving(design, content),
      label: `Tighten spacing to ${design.spacingLevel - 1}`,
    };
  }
  if (design.fontLevel > FONT_FLOOR) {
    return {
      kind: "font",
      to: design.fontLevel - 1,
      estPx: fontStepSaving(design, content),
      label: `Reduce text size to ${design.fontLevel - 1}`,
    };
  }
  if (input.allowTemplateSwap !== false) {
    const swap = denserTemplate(design.template);
    if (swap) {
      return {
        kind: "template",
        to: swap,
        estPx: spacingStepSaving(design, content),
        label: "Switch to the Compact layout",
      };
    }
  }
  return null; // design levers exhausted — the rest is content
}

/** Content stats from a measurement + the CV, for the estimator. */
export function contentStatsFrom(
  contentPx: number,
  avgLinePx: number,
  bullets: number,
  sections: number
): ContentStats {
  return {
    lines: Math.max(1, Math.round(contentPx / Math.max(avgLinePx, 1))),
    bullets,
    sections,
  };
}

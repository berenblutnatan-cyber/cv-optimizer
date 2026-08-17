// Single source of truth for the CV font-size + spacing "density" controls
// (the 1-10 Font/Spacing sliders, and the AI's set_design tool).
//
// Both the on-screen preview (SmartResumePreview) AND the off-screen PDF-export
// render (StudioBuilder) apply these, so what the user sees is what they
// download. Keeping the formulas here — rather than inline in the preview —
// is what guarantees preview and export can't drift apart.
//
// Levels run 1 (small / tight) … 10 (large / airy); 5 is normal.

import type React from "react";

// ── Density tokens (the template-refactor path) ─────────────────────────────
// Templates migrated to tokens declare their OWN designed px values and wrap
// them in scaled()/spaced(). At level 5 both multipliers are exactly 1.0, so a
// migrated template renders pixel-identical to its pre-migration self at the
// default sliders — that's the refactor's acceptance test. Away from level 5,
// EVERY sized value scales (headings, spans, padding — not just p/li/td the
// legacy override CSS could reach).
//
// fontMult:  0.75 (level 1) … 1.00 (level 5) … 1.30 (level 10)
// spaceMult: 0.25 (level 1) … 1.00 (level 5) … 1.60 (level 10)

export function fontMultiplier(fontLevel: number): number {
  const l = Math.min(10, Math.max(1, fontLevel));
  return l <= 5 ? 0.75 + (l - 1) * (0.25 / 4) : 1 + (l - 5) * (0.3 / 5);
}

export function spaceMultiplier(spacingLevel: number): number {
  const l = Math.min(10, Math.max(1, spacingLevel));
  return l <= 5 ? 0.25 + (l - 1) * (0.75 / 4) : 1 + (l - 5) * (0.6 / 5);
}

/** Wrap a designed font-size/text-metric px value so it follows the Font slider. */
export const scaled = (px: number) => `calc(${px}px * var(--cv-font-mult, 1))`;

/** Wrap a designed margin/padding/gap px value so it follows the Spacing slider. */
export const spaced = (px: number) => `calc(${px}px * var(--cv-space-mult, 1))`;

/** Gentle line-height squeeze: 0.92 (level 1) … 1.00 (level 5) … 1.08 (level 10).
 *  Full spaceMult would make text unreadable at tight levels. */
export function lineHeightMultiplier(spacingLevel: number): number {
  const l = Math.min(10, Math.max(1, spacingLevel));
  return l <= 5 ? 0.92 + (l - 1) * (0.08 / 4) : 1 + (l - 5) * (0.08 / 5);
}

/** Wrap a designed unitless line-height so it follows the Spacing slider (gently). */
export const leading = (lh: number) => `calc(${lh} * var(--cv-lh-mult, 1))`;

/** The CSS vars scaled()/spaced()/leading() consume — set on the preview/export wrapper. */
export function densityTokenVars(fontLevel: number, spacingLevel: number): React.CSSProperties {
  return {
    "--cv-font-mult": String(fontMultiplier(fontLevel)),
    "--cv-space-mult": String(spaceMultiplier(spacingLevel)),
    "--cv-lh-mult": String(lineHeightMultiplier(spacingLevel)),
  } as React.CSSProperties;
}

// The legacy `!important` override layer (densityInlineVars/densityClasses/
// densityOverrideCss) is gone: it could only reach p/li/td and heuristic
// selectors, so template-hardcoded headings, spans, and padding ignored the
// sliders — and at level 5 it actively distorted every template's designed
// look. All 18 templates now declare their own px values through
// scaled()/spaced()/leading(), so the tokens above are the whole system.

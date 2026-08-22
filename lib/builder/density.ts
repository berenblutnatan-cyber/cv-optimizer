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

/** Inline CSS vars set on the `.smart-resume-override` wrapper. */
export function densityInlineVars(fontLevel: number, spacingLevel: number): React.CSSProperties {
  // Font size: 8px (level 1) … 14px (level 10)
  const fontSize = 8 + (fontLevel - 1) * (6 / 9);
  // Line height: 1.1 (level 1) … 1.9 (level 10)
  const lineHeight = 1.1 + (spacingLevel - 1) * (0.8 / 9);
  // Section gaps: 2px (level 1, tighter) … 32px (level 10)
  const sectionGap = 2 + (spacingLevel - 1) * (30 / 9);
  // Paragraph gaps: 0px (level 1) … 16px (level 10)
  const paragraphGap = (spacingLevel - 1) * (16 / 9);
  // Item gaps: 0.5px (level 1) … 8px (level 10)
  const itemGap = 0.5 + (spacingLevel - 1) * (7.5 / 9);
  // Heading scales (proportional to base font)
  const h1Size = fontSize * 2.2;
  const h2Size = fontSize * 1.4;
  const h3Size = fontSize * 1.2;

  return {
    fontSize: `${fontSize}px`,
    lineHeight: lineHeight,
    "--base-font-size": `${fontSize}px`,
    "--line-height": `${lineHeight}`,
    "--section-gap": `${sectionGap}px`,
    "--item-gap": `${itemGap}px`,
    "--paragraph-gap": `${paragraphGap}px`,
    "--h1-size": `${h1Size}px`,
    "--h2-size": `${h2Size}px`,
    "--h3-size": `${h3Size}px`,
    "--p-margin": `${paragraphGap}px`,
    "--li-margin": `${itemGap}px`,
  } as React.CSSProperties;
}

/** Extra utility classes applied only at the tightest levels. */
export function densityClasses(fontLevel: number, spacingLevel: number): string {
  const compactExtras =
    fontLevel <= 2 && spacingLevel <= 2
      ? '[&_aside]:!py-2 [&_main]:!py-2 [&_header]:!mb-1 [&_[style*="padding"]]:!p-2'
      : "";
  return compactExtras.trim();
}

/** `!important` overrides that bypass each template's own inline sizing, scoped
 *  to `.smart-resume-override`. Injected via a <style> tag next to the render. */
export function densityOverrideCss(fontLevel: number, spacingLevel: number): string {
  const fs = 8 + (fontLevel - 1) * (6 / 9);
  const lh = 1.1 + (spacingLevel - 1) * (0.8 / 9);
  const secGap = 2 + (spacingLevel - 1) * (30 / 9);
  const itemGap = 0.5 + (spacingLevel - 1) * (7.5 / 9);
  const pGap = (spacingLevel - 1) * (16 / 9);
  const safePad = 6 + (spacingLevel - 1) * (14 / 9);

  return `
      .smart-resume-override p,
      .smart-resume-override li,
      .smart-resume-override td {
        font-size: ${fs}px !important;
        line-height: ${lh} !important;
      }
      .smart-resume-override p {
        margin-bottom: ${pGap}px !important;
        margin-top: 0 !important;
      }
      .smart-resume-override li {
        margin-bottom: ${itemGap}px !important;
      }
      .smart-resume-override ul,
      .smart-resume-override ol {
        margin-top: ${itemGap}px !important;
        margin-bottom: ${itemGap}px !important;
      }
      .smart-resume-override .a4-safe-area {
        padding: ${safePad}mm !important;
      }
      .smart-resume-override div[style*="margin-bottom"],
      .smart-resume-override section[style*="margin-bottom"],
      .smart-resume-override [class*="section"] {
        margin-bottom: ${secGap}px !important;
      }
      .smart-resume-override h1,
      .smart-resume-override h2,
      .smart-resume-override h3 {
        margin-bottom: ${secGap * 0.6}px !important;
        margin-top: ${secGap * 0.8}px !important;
      }
    `;
}

/**
 * The rendered metrics of a single line at these levels. Derived from the
 * SAME formulas as densityInlineVars above — the one-page fit loop needs to
 * convert "px over one page" into "lines to cut", and it must not re-derive
 * these numbers independently or the two would drift.
 */
export function lineMetrics(fontLevel: number, spacingLevel: number): {
  fontSize: number;
  lineHeight: number;
  linePx: number;
} {
  const fontSize = 8 + (fontLevel - 1) * (6 / 9);
  const lineHeight = 1.1 + (spacingLevel - 1) * (0.8 / 9);
  return { fontSize, lineHeight, linePx: fontSize * lineHeight };
}

"use client";

// The ONE way to render a CV off-screen for PDF/raster export.
//
// Encapsulates the density-correct export render (font/spacing override CSS +
// inline vars + compact classes) that StudioBuilder used to hand-roll — so
// every export surface (builder, optimizer results, template download card)
// produces exactly what the on-screen preview shows. Fixes the class of bug
// where a surface exported without the density layer and silently ignored the
// user's Font/Spacing sliders.

import React, { forwardRef } from "react";
import { densityClasses, densityInlineVars, densityOverrideCss } from "@/lib/builder/density";

type ExportSurfaceProps = {
  /** Density levels 1-10; 5/5 = normal. Pass the SAME values the visible
   *  preview uses or the download won't match the screen. */
  fontLevel?: number;
  spacingLevel?: number;
  /** The CV render (ResumePreview). Pass null/false to render an empty surface. */
  children?: React.ReactNode;
};

/** Off-screen A4-width export render. The forwarded ref is what you hand to
 *  exportToPdf / exportToWord. */
export const ExportSurface = forwardRef<HTMLDivElement, ExportSurfaceProps>(
  function ExportSurface({ fontLevel = 5, spacingLevel = 5, children }, ref) {
    return (
      <div aria-hidden className="fixed -left-[10000px] top-0 pointer-events-none">
        <div ref={ref} style={{ width: 794, background: "#ffffff" }}>
          {children ? (
            <>
              <style
                dangerouslySetInnerHTML={{ __html: densityOverrideCss(fontLevel, spacingLevel) }}
              />
              <div
                className={`smart-resume-override ${densityClasses(fontLevel, spacingLevel)}`}
                style={densityInlineVars(fontLevel, spacingLevel)}
              >
                {children}
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  }
);

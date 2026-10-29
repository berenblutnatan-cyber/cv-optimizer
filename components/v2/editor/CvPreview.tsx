"use client";

import * as React from "react";
import { TemplateRenderer } from "@/components/cv-templates/TemplateRenderer";
import type { ThemeColor } from "@/context/BuilderContext";
import { densityTokenVars } from "@/lib/builder/density";
import { PAGE_HEIGHT_PX } from "@/lib/builder/autofit";
import { useAutoFit, type FitSolution } from "@/hooks/useAutoFit";
import { DEFAULT_DESIGN, type ResumeDocument } from "@/lib/resume/document";
import { toTemplateData } from "@/lib/resume/view";
import { cn } from "@/components/ui/cn";

export const A4_WIDTH_PX = 794;

export type FitState = { ratio: number; fits: boolean; atMinimum: boolean };

/**
 * The CV exactly as it exports: the real template inside the scoped `.cv-doc`
 * stylesheet, scaled down to fit its pane. `docRef` is the export root.
 */
export function CvPreview({
  doc,
  docRef,
  onAutoFit,
  onFit,
  className,
}: {
  doc: ResumeDocument;
  docRef: React.RefObject<HTMLDivElement>;
  /** Auto-fit picked new density levels. */
  onAutoFit?: (levels: { fontLevel: number; spacingLevel: number }) => void;
  onFit?: (fit: FitState) => void;
  className?: string;
}) {
  const frameRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.6);
  const [height, setHeight] = React.useState(PAGE_HEIGHT_PX);
  const { design } = doc;
  const data = React.useMemo(() => toTemplateData(doc.content), [doc.content]);
  const multi = design.pageMode === "multi";

  // Fit the A4 page to the pane width.
  React.useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setScale(Math.max(0.3, Math.min(1, w / A4_WIDTH_PX)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Track the rendered height (multi-page grows in whole A4 steps).
  React.useLayoutEffect(() => {
    const page = docRef.current?.querySelector<HTMLElement>(".a4-wrapper");
    if (!page) return;
    const measure = () => {
      const h = multi ? Math.max(PAGE_HEIGHT_PX, Math.ceil(page.scrollHeight / PAGE_HEIGHT_PX) * PAGE_HEIGHT_PX) : PAGE_HEIGHT_PX;
      setHeight(h);
      onFit?.({ ratio: page.scrollHeight / PAGE_HEIGHT_PX, fits: page.scrollHeight <= PAGE_HEIGHT_PX + 2, atMinimum: false });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(page);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docRef, multi, data, design.template]);

  useAutoFit({
    containerRef: docRef,
    contentKey: data,
    templateKey: `${design.template}:${design.pageMode}`,
    enabled: design.autoFit && !multi,
    // Solve from the designed default, not the current levels, so a CV that
    // got shorter grows back to normal size instead of staying shrunk.
    getCurrent: () => ({ fontLevel: DEFAULT_DESIGN.fontLevel, spacingLevel: DEFAULT_DESIGN.spacingLevel }),
    onSolve: (s: FitSolution) => {
      onFit?.({ ratio: s.ratio, fits: s.fits, atMinimum: s.atMinimum });
      if (s.fontLevel !== design.fontLevel || s.spacingLevel !== design.spacingLevel) {
        onAutoFit?.({ fontLevel: s.fontLevel, spacingLevel: s.spacingLevel });
      }
    },
  });

  const pages = Math.round(height / PAGE_HEIGHT_PX);

  return (
    <div ref={frameRef} className={cn("w-full", className)}>
      <div className="relative mx-auto" style={{ width: A4_WIDTH_PX * scale, height: height * scale }}>
        <div
          className="absolute left-0 top-0 origin-top-left overflow-hidden rounded-[2px] bg-white shadow-pop"
          style={{ width: A4_WIDTH_PX, height, transform: `scale(${scale})` }}
        >
          <div
            ref={docRef}
            className="cv-doc"
            data-page-mode={design.pageMode}
            style={densityTokenVars(design.fontLevel, design.spacingLevel)}
          >
            <TemplateRenderer templateId={design.template} data={data} themeColor={design.accentColor as ThemeColor} />
          </div>
          {multi &&
            Array.from({ length: pages - 1 }, (_, i) => (
              <div
                key={i}
                aria-hidden
                className="pointer-events-none absolute inset-x-0 border-t border-dashed border-control/60"
                style={{ top: (i + 1) * PAGE_HEIGHT_PX }}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

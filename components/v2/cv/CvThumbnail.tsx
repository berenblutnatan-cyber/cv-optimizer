"use client";

import * as React from "react";
import { TemplateRenderer } from "@/components/cv-templates/TemplateRenderer";
import type { ThemeColor } from "@/lib/design/accents";
import { densityTokenVars } from "@/lib/builder/density";
import { PAGE_HEIGHT_PX, solveFit } from "@/lib/builder/autofit";
import { DEFAULT_DESIGN, type DesignState } from "@/lib/resume/document";
import type { TemplateRegistryId } from "@/lib/templates/registry";
import type { TemplateData } from "@/lib/resume/view";
import { cn } from "@/components/ui/cn";

const A4_W = 794;

export type ThumbFit = { fits: boolean; atMinimum: boolean };

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

/**
 * The first page of a CV, rendered by the real template and scaled to the
 * container width. It solves auto-fit the same way the editor preview does,
 * so a thumbnail shows what choosing that design will actually produce.
 * Mounts the template only once scrolled near the viewport.
 */
export function CvThumbnail({
  data,
  design,
  onFit,
  className,
  eager = false,
}: {
  data: TemplateData;
  design: Pick<DesignState, "template" | "accentColor" | "fontLevel" | "spacingLevel" | "autoFit" | "pageMode">;
  onFit?: (fit: ThumbFit) => void;
  className?: string;
  /** Render immediately (above the fold) instead of waiting to be scrolled into view. */
  eager?: boolean;
}) {
  const frameRef = React.useRef<HTMLDivElement>(null);
  const docRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0);
  const [visible, setVisible] = React.useState(eager);
  const solving = design.autoFit && design.pageMode === "one";
  const [levels, setLevels] = React.useState<{ fontLevel: number; spacingLevel: number } | null>(
    solving ? null : { fontLevel: design.fontLevel, spacingLevel: design.spacingLevel },
  );
  const onFitRef = React.useRef(onFit);
  onFitRef.current = onFit;

  React.useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / A4_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    if (visible) return;
    const el = frameRef.current;
    if (!el) return;
    // rootMargin only extends the observer's root, so observe against the
    // nearest scrolling ancestor (a panel), not the page, to preload ahead.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { root: scrollParent(el), rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  // The template is in the DOM only once it is near the viewport AND the
  // frame has a width to scale to.
  const rendered = visible && scale > 0;

  // Solve (or just measure) once the template is laid out with its final
  // fonts, exactly like the editor's auto-fit (hooks/useAutoFit): measuring
  // during the first commit can be a few px off, enough to flip "fits".
  // Re-solve whenever the rendered content changes size afterwards.
  React.useEffect(() => {
    if (!rendered) return;
    const varsEl = docRef.current;
    const page = varsEl?.querySelector<HTMLElement>(".a4-wrapper");
    if (!varsEl || !page) return;
    let cancelled = false;
    let frame = 0;
    const solve = () => {
      if (cancelled) return;
      if (solving) {
        const s = solveFit(varsEl, page, { fontLevel: DEFAULT_DESIGN.fontLevel, spacingLevel: DEFAULT_DESIGN.spacingLevel });
        setLevels((cur) => (cur?.fontLevel === s.fontLevel && cur?.spacingLevel === s.spacingLevel ? cur : { fontLevel: s.fontLevel, spacingLevel: s.spacingLevel }));
        onFitRef.current?.({ fits: s.fits, atMinimum: s.atMinimum });
      } else {
        setLevels((cur) => (cur?.fontLevel === design.fontLevel && cur?.spacingLevel === design.spacingLevel ? cur : { fontLevel: design.fontLevel, spacingLevel: design.spacingLevel }));
        onFitRef.current?.({ fits: page.scrollHeight <= PAGE_HEIGHT_PX + 2, atMinimum: false });
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(solve);
    };
    void (document.fonts?.ready ?? Promise.resolve()).then(schedule);
    // The page box is a fixed A4; its content box is what grows or shrinks.
    const content = page.firstElementChild;
    const ro = content ? new ResizeObserver(schedule) : null;
    if (content) ro!.observe(content);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      ro?.disconnect();
    };
  }, [rendered, solving, data, design.template, design.fontLevel, design.spacingLevel]);

  const lv = levels ?? { fontLevel: DEFAULT_DESIGN.fontLevel, spacingLevel: DEFAULT_DESIGN.spacingLevel };

  return (
    <div
      ref={frameRef}
      aria-hidden
      className={cn("relative aspect-[210/297] w-full overflow-hidden bg-white", className)}
    >
      {rendered && (
        <div
          className={cn("pointer-events-none absolute left-0 top-0 origin-top-left select-none transition-opacity duration-200", levels ? "opacity-100" : "opacity-0")}
          style={{ width: A4_W, height: PAGE_HEIGHT_PX, transform: `scale(${scale})` }}
          // The template contains links; a thumbnail must never take focus.
          ref={(el) => el?.setAttribute("inert", "")}
        >
          <div ref={docRef} className="cv-doc" data-page-mode="one" style={densityTokenVars(lv.fontLevel, lv.spacingLevel)}>
            <TemplateRenderer templateId={design.template as TemplateRegistryId} data={data} themeColor={design.accentColor as ThemeColor} />
          </div>
        </div>
      )}
      {(!visible || !levels) && <div className="skeleton absolute inset-0" />}
    </div>
  );
}

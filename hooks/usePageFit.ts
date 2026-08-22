"use client";

// Quantitative one-page measurement.
//
// REPLACES the boolean check inside SmartResumePreview:
//   setIsOverflowing(wrapper.scrollHeight > A4_HEIGHT_PX + 10)
// which could only ever say "too long" — never how long, never how many
// pages, and never enough for anything to decide what to do about it.
//
// Measures the SAME node against the SAME constant the raster exporter uses
// (utils/exportToPdf.ts computes pageCount from canvas height / A4 page
// height), so "it fits" on screen and "it's one page" in the PDF are the same
// claim rather than two guesses.

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { A4_HEIGHT_PX } from "@/components/cv-templates/A4PageWrapper";
import { lineMetrics } from "@/lib/builder/density";

/** Tolerance so a sub-pixel rounding difference isn't reported as overflow. */
const FIT_TOLERANCE_PX = 10;

export interface PageFit {
  /** Full rendered content height, including the part clipped off page 1. */
  contentPx: number;
  /** Px past one page. 0 when it fits. */
  overflowPx: number;
  /** How many A4 pages this currently needs. */
  pages: number;
  fits: boolean;
  /** Height of one rendered line at the current density. */
  avgLinePx: number;
  /** Rounded-up lines that must come out to fit. 0 when it fits. */
  linesOver: number;
  /** False until the first measurement lands. */
  measured: boolean;
}

export interface PageFitDeps {
  fontLevel: number;
  spacingLevel: number;
  /** Anything whose change should trigger a re-measure (template, CV data). */
  watch?: unknown;
}

export function usePageFit(
  containerRef: RefObject<HTMLElement | null>,
  deps: PageFitDeps
): PageFit & { remeasure: () => void } {
  const { fontLevel, spacingLevel, watch } = deps;
  const { linePx } = lineMetrics(fontLevel, spacingLevel);

  const [contentPx, setContentPx] = useState(0);
  const [measured, setMeasured] = useState(false);
  const rafRef = useRef<number | null>(null);

  const measure = useCallback(() => {
    const node = containerRef.current;
    if (!node) return;
    // The .a4-wrapper is height-fixed with overflow:hidden (one page is
    // hard-clipped on screen), so its own box never grows — scrollHeight is
    // what still reports the true content height behind the clip.
    const wrapper = node.querySelector<HTMLElement>(".a4-wrapper");
    const h = wrapper ? wrapper.scrollHeight : node.scrollHeight;
    if (h > 0) {
      setContentPx(h);
      setMeasured(true);
    }
  }, [containerRef]);

  // Re-measure on density/template/content change. Two rAFs so the browser has
  // applied the new CSS vars and laid out before we read scrollHeight —
  // reading in the same frame returns the PREVIOUS layout, which is what makes
  // a naive fit loop oscillate.
  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        measure();
      });
    });
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [measure, fontLevel, spacingLevel, watch]);

  // Fonts finish loading after first paint and change line heights.
  useEffect(() => {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fonts?.ready) return;
    let cancelled = false;
    fonts.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
    };
  }, [measure]);

  // Catch reflows we didn't trigger (image loads, container resize).
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    const wrapper = node.querySelector<HTMLElement>(".a4-wrapper");
    ro.observe(wrapper ?? node);
    return () => ro.disconnect();
  }, [containerRef, measure]);

  const overflowPx = Math.max(0, contentPx - A4_HEIGHT_PX);
  const fits = !measured || contentPx <= A4_HEIGHT_PX + FIT_TOLERANCE_PX;

  return {
    contentPx,
    overflowPx: fits ? 0 : overflowPx,
    pages: measured ? Math.max(1, Math.ceil(contentPx / A4_HEIGHT_PX - 0.01)) : 1,
    fits,
    avgLinePx: linePx,
    linesOver: fits ? 0 : Math.ceil(overflowPx / Math.max(linePx, 1)),
    measured,
    remeasure: measure,
  };
}

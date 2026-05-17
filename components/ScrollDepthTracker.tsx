"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

/**
 * Fires a `scroll_depth` event at 25/50/75/100% scroll milestones,
 * once per page load. Clarity reports landing-page scroll depth dies
 * at ~25% — adding granular events lets us measure improvements
 * (and split by source/device in PostHog).
 *
 * Drop one of these at the bottom of any page where scroll-depth
 * matters. The component renders nothing.
 */
export function ScrollDepthTracker({ page }: { page: string }) {
  const fired = useRef<Set<number>>(new Set());

  useEffect(() => {
    const thresholds = [25, 50, 75, 100];

    const onScroll = () => {
      const docHeight = document.documentElement.scrollHeight;
      const viewport = window.innerHeight;
      const scrolled = window.scrollY + viewport;
      if (docHeight <= viewport) return; // nothing to scroll
      const pct = Math.round((scrolled / docHeight) * 100);
      for (const t of thresholds) {
        if (pct >= t && !fired.current.has(t)) {
          fired.current.add(t);
          track("scroll_depth", { page, threshold: t });
        }
      }
    };

    // Throttle to one call per animation frame.
    let raf = 0;
    const handler = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        onScroll();
      });
    };

    window.addEventListener("scroll", handler, { passive: true });
    // Run once in case the page is short enough that initial view
    // already covers a threshold.
    onScroll();

    return () => {
      window.removeEventListener("scroll", handler);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [page]);

  return null;
}

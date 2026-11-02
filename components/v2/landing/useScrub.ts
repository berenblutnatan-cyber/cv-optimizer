"use client";

import { useEffect, useRef } from "react";
import { clamp } from "@/lib/landing/penScene";

/** Below this height a pinned scene would not fit, so it shows finished. */
export const CALM_QUERY = "(prefers-reduced-motion: reduce), (max-height: 699px)";

/**
 * Runs onFrame with 0-1 scroll progress, damped so a mouse wheel still glides.
 * "pin": through a tall section's sticky child. "enter": as a section comes into
 * view. In calm mode it runs once at 1, so nothing is left half drawn.
 */
export function useScrub(mode: "pin" | "enter", onFrame: (p: number, root: HTMLElement) => void, onMeasure?: (root: HTMLElement) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(onFrame);
  frame.current = onFrame;
  const size = useRef(onMeasure);
  size.current = onMeasure;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const calm = window.matchMedia(CALM_QUERY);
    let cur = 0, goal = 0, raf = 0;
    const read = () => {
      const box = root.getBoundingClientRect();
      const vh = window.innerHeight;
      if (mode === "enter") return clamp((vh - box.top) / (Math.min(box.height, vh) * 1.1));
      return clamp(-(box.top - 56) / Math.max(1, box.height - (vh - 56)));
    };
    const step = () => {
      cur += (goal - cur) * 0.16;
      if (Math.abs(goal - cur) < 0.0005) { cur = goal; raf = 0; } else raf = requestAnimationFrame(step);
      frame.current(cur, root);
    };
    const onScroll = () => {
      if (calm.matches) return;
      goal = read();
      if (!raf) raf = requestAnimationFrame(step);
    };
    const sync = () => {
      if (calm.matches) { size.current?.(root); frame.current(1, root); return; }
      size.current?.(root);
      goal = cur = read();
      frame.current(cur, root);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", sync);
    calm.addEventListener("change", sync);
    sync();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", sync);
      calm.removeEventListener("change", sync);
    };
  }, [mode]);

  return ref;
}

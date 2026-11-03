"use client";

import * as React from "react";
import { cn } from "./cn";

/** Fires once when the element scrolls into view (or at once without IntersectionObserver). */
function useSeen<T extends Element>() {
  const ref = React.useRef<T>(null);
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setSeen(true);
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

/** A highlighter pass behind a few words. Use once per screen, on the words that matter. */
export function Marker({ children, className }: { children: React.ReactNode; className?: string }) {
  const [ref, seen] = useSeen<HTMLSpanElement>();
  return (
    <span ref={ref} data-on={seen || undefined} className={cn("marker", className)}>
      {children}
    </span>
  );
}

// Brand colours only, and few of them: a nod, not a party.
const BITS = [
  { x: -150, y: -110, c: "rgb(var(--c-accent))" },
  { x: 140, y: -120, c: "rgb(var(--c-warn))" },
  { x: -120, y: 40, c: "rgb(var(--c-success))" },
  { x: 160, y: 20, c: "rgb(var(--c-accent))" },
  { x: -40, y: -150, c: "rgb(var(--c-success))" },
  { x: 60, y: -160, c: "rgb(var(--c-accent))" },
  { x: -170, y: -30, c: "rgb(var(--c-warn))" },
  { x: 100, y: 70, c: "rgb(var(--c-warn))" },
];

/**
 * The stamp for a rare win (first CV exported, an offer logged). `play` changes
 * replay it. Decorative: say the win in words elsewhere for screen readers.
 */
export function Stamp({ children, play, className }: { children: React.ReactNode; play: number; className?: string }) {
  return (
    <span key={play} data-on={play > 0 || undefined} className="pointer-events-none relative inline-grid place-items-center" aria-hidden>
      {BITS.map((b, i) => (
        <i key={i} className="bit" style={{ ["--x" as string]: `${b.x}px`, ["--y" as string]: `${b.y}px`, background: b.c }} />
      ))}
      <span
        data-on={play > 0 || undefined}
        className={cn("stamp rounded-card border-[5px] border-success bg-surface/90 px-4 py-1 text-[40px] font-extrabold leading-none tracking-[0.04em] text-success", className)}
      >
        {children}
      </span>
    </span>
  );
}

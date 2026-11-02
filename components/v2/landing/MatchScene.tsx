"use client";

import { Check } from "lucide-react";
import { matchRowAt } from "@/lib/landing/penScene";
import { useScrub } from "./useScrub";

/** Pinned: scrolling wires each job requirement to the CV line that proves it. */
export function MatchScene({ title, rows, example }: { title: string; rows: { need: string; line: string }[]; example: string }) {
  const ref = useScrub("pin", (p, root) => {
    let matched = 0;
    rows.forEach((_, i) => {
      const r = matchRowAt(p, i, rows.length);
      const row = root.querySelector<HTMLElement>(`[data-row="${i}"]`)!;
      row.querySelector<SVGPathElement>(".cp-wire path")!.style.strokeDashoffset = String(1 - r.wire);
      row.querySelector<HTMLElement>("[data-mark]")!.style.backgroundSize = `${r.mark * 100}% 42%`;
      row.classList.toggle("on", r.done);
      if (r.done) matched += 1;
    });
    root.querySelector<HTMLElement>("[data-count]")!.textContent = `${matched}/${rows.length}`;
  });

  return (
    <div ref={ref} className="cp-match">
      <div className="cp-match-pin">
        <div className="cp-match-in">
          <div className="cp-match-top">
            <h2 className="cp-serif cp-h2 text-balance text-ink">{title}</h2>
            <span data-count className="cp-serif cp-count">0/{rows.length}</span>
          </div>
          <ul className="cp-rows">
            {rows.map((r, i) => (
              <li key={r.need} data-row={i} className="cp-row">
                <span className="cp-need"><Check className="size-5" aria-hidden /> {r.need}</span>
                <svg className="cp-wire" viewBox="0 0 140 40" preserveAspectRatio="none" aria-hidden="true">
                  <path pathLength={1} d="M0 20C40 4 96 36 140 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <span className="cp-line"><span data-mark>{r.line}</span></span>
              </li>
            ))}
          </ul>
          <p className="text-dense text-ink-2">{example}</p>
        </div>
      </div>
    </div>
  );
}

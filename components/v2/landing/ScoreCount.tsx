"use client";

import { ease } from "@/lib/landing/penScene";
import { useScrub } from "./useScrub";

/** The number climbs and the bars fill as the section scrolls in. */
export function ScoreCount({ total, rows, label }: { total: number; rows: { name: string; value: number }[]; label: string }) {
  const ref = useScrub("enter", (p, root) => {
    const e = ease(p);
    root.querySelector<HTMLElement>("[data-big]")!.textContent = String(Math.round(total * (0.6 + 0.4 * e)));
    rows.forEach((r, i) => {
      const v = r.value * (0.6 + 0.4 * e);
      root.querySelector<HTMLElement>(`[data-fill="${i}"]`)!.style.transform = `scaleX(${v / 100})`;
      root.querySelector<HTMLElement>(`[data-num="${i}"]`)!.textContent = String(Math.round(v));
    });
  });

  return (
    <div ref={ref} className="cp-score" aria-label={label} role="img">
      <div data-big className="cp-serif cp-big">{total}</div>
      <div className="cp-bars">
        {rows.map((r, i) => (
          <div key={r.name} className="cp-bar">
            <span>{r.name}</span>
            <div className="cp-track"><div data-fill={i} className="cp-fill" /></div>
            <span data-num={i} className="tabular">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

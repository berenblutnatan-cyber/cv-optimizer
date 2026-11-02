"use client";

import { fanAt } from "@/lib/landing/penScene";
import { useScrub } from "./useScrub";

/** Starts as one stack in the middle and deals out into the grid on scroll. */
export function TemplateFan({ children }: { children: React.ReactNode }) {
  const homes = { cx: 0, cy: 0 };
  const cards = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(":scope > ul > li")].filter((li) => li.offsetParent);
  const ref = useScrub(
    "enter",
    (p, root) => {
      const list = cards(root);
      list.forEach((li, i) => {
        const v = fanAt(p, i, list.length), off = 1 - v;
        const dx = (homes.cx - li.offsetLeft - li.offsetWidth / 2) * off;
        const dy = (homes.cy - li.offsetTop - li.offsetHeight / 2) * off;
        li.style.transform = v === 1 ? "" : `translate(${dx}px, ${dy}px) rotate(${(i - (list.length - 1) / 2) * 5 * off}deg)`;
      });
    },
    (root) => {
      homes.cx = root.offsetWidth / 2;
      homes.cy = root.offsetHeight / 2;
    },
  );
  return <div ref={ref} className="cp-fan">{children}</div>;
}

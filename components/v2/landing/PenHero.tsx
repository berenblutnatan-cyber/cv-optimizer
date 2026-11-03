"use client";

import { useEffect, useRef } from "react";
import { NOTES, PEN_LINES, rewriteAt, scoreAt, SCORE_FROM, stepAt, STRIKES, WON_AT } from "@/lib/landing/penScene";
import type { PenSample } from "@/lib/landing/penSample";

const CONFETTI = [
  [-260, -240], [-180, -320], [-70, -360], [60, -340], [170, -290], [240, -190],
  [-320, -110], [280, -70], [-220, -40], [-120, -210], [120, -170], [30, -240],
].map(([x, y], i) => ({ x, y, c: ["#4650c8", "#c9ccf2", "#f6e7ad"][i % 3], round: i % 2 === 1 }));

/**
 * The landing's opening: copy on one side, an example CV on the other that
 * rewrites itself on a loop. The CV is in the page's language and direction,
 * and the pen writes from the reading side. It stops off screen and in a hidden tab. Frames
 * write straight to the DOM, so React never re-renders for them. With reduced
 * motion it shows the finished CV.
 */
export function PenHero({ copy, exampleLabel, sample, dir }: { copy: React.ReactNode; exampleLabel: string; sample: PenSample; dir: "ltr" | "rtl" }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = root.current;
    if (!hero) return;
    const $ = <E extends HTMLElement>(sel: string) => hero.querySelector<E>(sel)!;
    const stage = $(".cp-stage"), score = $("[data-score]"), sheetA = $(".cp-sheet-a"), sheetB = $(".cp-sheet-b");
    const part = (id: string) => $(`[data-pen="${id}"]`);
    const rtl = dir === "rtl";

    const write = (q: number) => {
      for (const [id, from, to] of PEN_LINES) {
        const v = stepAt(q, from, to);
        const hidden = `${v === 1 ? -2 : 100 - v * 100}%`;
        part(id).style.clipPath = rtl ? `inset(0 0 0 ${hidden})` : `inset(0 ${hidden} 0 0)`;
      }
      for (const [id, from, to] of STRIKES) {
        const v = stepAt(q, from, to), line = part(id).querySelector("path")!;
        line.style.strokeDashoffset = String(1 - v);
        line.style.opacity = v > 0 ? "1" : "0";
      }
      for (const [id, at] of NOTES) part(id).classList.toggle("on", q >= at);
      score.textContent = String(scoreAt(q));
      stage.classList.toggle("won", q >= WON_AT);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      stage.classList.remove("party");
      write(1);
      return;
    }

    let raf = 0, last = 0, clock = 0, seen = true, cycles = 0;
    const tick = (now: number) => {
      clock += Math.min(100, now - last) / 1000;
      last = now;
      const q = rewriteAt(clock);
      write(q);
      if (q === 0 && clock > 1 && cycles === 0) { cycles = 1; stage.classList.remove("party"); }
      raf = requestAnimationFrame(tick);
    };
    const run = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (seen && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); }
    };
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; run(); });
    io.observe(hero);
    document.addEventListener("visibilitychange", run);

    // The sheets behind the CV open like a hand of cards as the visitor leaves.
    const onScroll = () => {
      const p = Math.min(1, Math.max(0, window.scrollY / hero.offsetHeight));
      sheetA.style.transform = `translateX(${-34 - p * 90}px) rotate(${-6 - p * 8}deg)`;
      sheetB.style.transform = `translateX(${34 + p * 90}px) rotate(${5 + p * 8}deg)`;
    };
    // The page leans toward a mouse. Never on touch, which has no hover to lean to.
    const paper = $(".cp-tilt");
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const b = stage.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (e.clientX - b.left - b.width / 2) / window.innerWidth * 2));
      const y = Math.max(-1, Math.min(1, (e.clientY - b.top - b.height / 2) / window.innerHeight * 2));
      paper.style.transform = `perspective(1400px) rotateY(${x * 6}deg) rotateX(${-y * 5}deg) rotate(${rtl ? 1.2 : -1.2}deg)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    onScroll();
    run();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [dir]);

  return (
    <section ref={root} className="cp-hero">
      <div className="cp-hero-in">
        <div className="cp-copy">{copy}</div>
        <div className="cp-stage party" dir={dir}>
          <div className="cp-sheet cp-sheet-a" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div className="cp-sheet cp-sheet-b" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div className="cp-tilt">
            <div className="cp-paper">
              <div className="cp-ring" aria-hidden="true"><b data-score>{SCORE_FROM}</b><span>{sample.score}</span></div>
              <div className="cp-name">{sample.name}</div>
              <div className="cp-role">{sample.role}</div>
              <div className="cp-head">{sample.experience}</div>
              <p className="cp-old"><span data-pen="s1">{sample.weak1}<Strike d="M2 6C90 2 200 8 298 3" /></span></p>
              <div className="cp-blk" data-pen="k1">
                <span className="cp-fix" data-pen="f1">{sample.fix1[0]}</span>
                <span className="cp-fix" data-pen="f2">{sample.fix1[1]}{dir === "ltr" ? " " : ""}<mark>{sample.fix1Mark}</mark></span>
              </div>
              <div className="cp-tags"><em data-pen="n1">{sample.notes.verb}</em><em data-pen="n2" className="cp-tag-y">{sample.notes.number}</em></div>
              <p className="cp-old cp-gap"><span data-pen="s2">{sample.weak2}<Strike d="M2 4C90 8 200 2 298 6" /></span></p>
              <div className="cp-blk" data-pen="k2">
                <span className="cp-fix" data-pen="f3">{sample.fix2[0]}</span>
                <span className="cp-fix" data-pen="f4">{sample.fix2[1]}</span>
              </div>
              <div className="cp-tags"><em data-pen="n3">{sample.notes.job}</em></div>
              <span className="cp-example">{exampleLabel}</span>
              <div className="cp-stamp" aria-hidden="true">{sample.stamp}</div>
            </div>
          </div>
          {sample.swaps.map(([was, now], i) => (
            <div key={was} className={`cp-float cp-f${i + 1}`} aria-hidden="true"><div className="cp-swap"><s>{was}</s><b>{now}</b></div></div>
          ))}
          {CONFETTI.map((c, i) => (
            <i key={i} className="cp-bit" aria-hidden="true" style={{ "--x": `${c.x}px`, "--y": `${c.y}px`, "--c": c.c, borderRadius: c.round ? "50%" : 2 } as React.CSSProperties} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Strike({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 300 10" preserveAspectRatio="none" aria-hidden="true">
      <path pathLength={1} d={d} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

"use client";

/**
 * RewriteShowcase — the homepage signature.
 *
 * One résumé line, two voices. The "before" is the flat, dutiful line almost
 * everyone actually writes (set in mono — the machine's register). The "after"
 * is what Hired turns it into: specific, quantified, recruiter-ready (set in the
 * human serif register). The ATS match score climbs, the numbers light up in
 * brass, and the keywords the parser was hunting for snap into place.
 *
 * It is the product's whole value proposition made visible in the page's own
 * type system — and it works for any role, which is the point of the role pills.
 *
 * Fail-safe by design: the resting state (final, "rewritten") is what renders on
 * first paint, so the section is never blank or stuck mid-animation. Motion is
 * CSS-driven (robust on backgrounded tabs) and re-plays only when the visitor
 * switches roles. This deliberately avoids the JS-animation freeze class noted
 * elsewhere in this app.
 */

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";

type Example = {
  role: string;
  before: string;
  after: string;
  keywords: string[];
  from: number;
  to: number;
};

const EXAMPLES: Example[] = [
  {
    role: "Engineer",
    before:
      "Responsible for managing the team's AWS infrastructure and keeping costs down where possible.",
    after:
      "Cut AWS spend 31% ($420K/yr) by re-architecting 12 services onto spot instances and autoscaling.",
    keywords: ["AWS", "cost optimization", "autoscaling"],
    from: 48,
    to: 92,
  },
  {
    role: "Product",
    before:
      "Worked closely with engineering and design to ship new features for our users.",
    after:
      "Shipped 3 flagship features that lifted 30-day retention from 41% to 58% across 2M users.",
    keywords: ["retention", "roadmap", "cross-functional"],
    from: 53,
    to: 90,
  },
  {
    role: "Marketing",
    before:
      "Helped grow the company's presence on social media across several platforms.",
    after:
      "Grew organic social to 120K followers at 4.2% engagement — 3× the category median.",
    keywords: ["organic growth", "engagement rate", "content strategy"],
    from: 45,
    to: 89,
  },
  {
    role: "New grad",
    before: "Did a final-year project about machine learning for one of my classes.",
    after:
      "Built a fraud-detection model (94% recall) on 1.2M transactions; presented to a faculty panel.",
    keywords: ["machine learning", "model evaluation", "Python"],
    from: 39,
    to: 86,
  },
];

/** Wrap quantified tokens (12, 31%, $420K, 3×, 2M …) in brass — proof that the
 *  rewrite earned its strength by getting specific. */
function Quantified({ text }: { text: string }) {
  const parts = text.split(/(\$?\d[\d,.]*\s?(?:%|×|x|K|M|\/yr)?)/g);
  return (
    <>
      {parts.map((p, i) =>
        /\d/.test(p) ? (
          <span key={i} className="font-semibold text-[#9a6b08]">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduce;
}

export function RewriteShowcase() {
  const { t } = useT();
  const reduce = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);
  const ex = EXAMPLES[index];

  // Score + bar default to the FINAL (rewritten) values — fail-safe resting
  // state. They climb only when the example changes, never blocking first paint.
  const [score, setScore] = useState(ex.to);
  const [fill, setFill] = useState(ex.to);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return; // first paint already shows the final state
    }
    if (reduce) {
      setScore(ex.to);
      setFill(ex.to);
      return;
    }
    // CSS-transition the bar from `from` → `to`
    setFill(ex.from);
    const toFull = requestAnimationFrame(() => setFill(ex.to));
    // rAF count-up for the number
    setScore(ex.from);
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setScore(Math.round(ex.from + (ex.to - ex.from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(toFull);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, reduce]);

  useEffect(() => {
    if (!auto || reduce) return;
    const t = window.setTimeout(
      () => setIndex((i) => (i + 1) % EXAMPLES.length),
      5400,
    );
    return () => window.clearTimeout(t);
  }, [auto, reduce, index]);

  function pick(i: number) {
    setAuto(false);
    setIndex(i);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* The document */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-[#0A2647]/10 bg-white shadow-[0_30px_80px_-32px_rgba(10,38,71,0.35)]">
        {/* brass top hairline — the "Hired" seam */}
        <div className="h-1 w-full bg-gradient-to-r from-[#B8860B] via-[#D4A83F] to-[#B8860B]" />

        <div className="p-6 sm:p-9">
          {/* BEFORE — the machine register */}
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#0A2647]/40">
            {t("The line you'd write")}
          </p>
          <p className="mt-3 min-h-[3.5rem] font-mono text-[15px] leading-relaxed text-[#0A2647]/45 sm:text-base">
            {t(ex.before)}
          </p>

          {/* seam */}
          <div className="my-6 flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-[#0A2647]/10" />
            <span className="inline-flex items-center gap-2 rounded-full bg-[#B8860B]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#9a6b08]">
              {t("Hired rewrites")}
            </span>
            <span className="h-px flex-1 bg-[#0A2647]/10" />
          </div>

          {/* AFTER — the human register */}
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#9a6b08]">
            {t("What a recruiter remembers")}
          </p>
          <p
            key={`after-${index}`}
            className="mt-3 min-h-[3.5rem] animate-fade-in font-serif text-xl leading-snug text-[#0A2647] sm:text-2xl"
          >
            <Quantified text={t(ex.after)} />
          </p>

          {/* keyword chips the parser was hunting for */}
          <div key={`kw-${index}`} className="mt-5 flex min-h-[2rem] animate-fade-in flex-wrap gap-2">
            {ex.keywords.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#B8860B]/30 bg-[#B8860B]/[0.08] px-3 py-1 font-mono text-xs text-[#9a6b08]"
              >
                <span className="text-[#B8860B]">✓</span>
                {t(k)}
              </span>
            ))}
          </div>

          {/* ATS match score — the machine's verdict, climbing */}
          <div className="mt-7 rounded-2xl bg-[#0A2647]/[0.035] p-4 sm:p-5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#0A2647]/50">
                {t("ATS match score")}
              </span>
              <span className="flex items-baseline gap-2 font-mono tabular-nums">
                <span className="text-2xl font-semibold text-[#0A2647]">{score}</span>
                <span className="text-sm text-[#0A2647]/35">/ 100</span>
                <span className="rounded-full bg-[#1f7a3d]/10 px-2 py-0.5 text-xs font-semibold text-[#1f7a3d]">
                  +{ex.to - ex.from}
                </span>
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#0A2647]/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#B8860B] to-[#D4A83F] transition-[width] duration-700 ease-out motion-reduce:transition-none"
                style={{ width: `${fill}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Role pills — proof it works for any career, and the way to drive it */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <span className="me-1 hidden font-mono text-[11px] uppercase tracking-[0.18em] text-[#0A2647]/40 sm:inline">
          {t("Try a role")}
        </span>
        {EXAMPLES.map((e, i) => (
          <button
            key={e.role}
            onClick={() => pick(i)}
            aria-pressed={i === index}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none ${
              i === index
                ? "border-[#0A2647] bg-[#0A2647] text-white shadow-sm"
                : "border-[#0A2647]/15 bg-white text-[#0A2647]/70 hover:border-[#0A2647]/40 hover:text-[#0A2647]"
            }`}
          >
            {t(e.role)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default RewriteShowcase;

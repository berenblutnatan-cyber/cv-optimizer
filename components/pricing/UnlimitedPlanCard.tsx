"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Infinity as InfinityIcon } from "lucide-react";
import { track } from "@/lib/analytics";

const FEATURES = [
  "Unlimited CV scores & re-scores",
  "Unlimited AI optimization, tailored to any job",
  "Unlimited downloads — PDF & Word, every template",
  "Unlimited chat & voice building (no daily limit)",
  "Priority processing",
];

// The flagship. The Monthly ⇄ 3-month-pass toggle is the page's signature: it
// swaps the price and the framing (recurring vs. a one-time pass for one job
// search). Each option's CTA falls back to "Coming soon" until its Polar
// product exists, so nobody hits a dead checkout.
export function UnlimitedPlanCard({
  monthlyConfigured,
  passConfigured,
}: {
  monthlyConfigured: boolean;
  passConfigured: boolean;
}) {
  const [pass, setPass] = useState(true);
  const plan = pass ? "unlimited_quarter" : "unlimited_monthly";
  const configured = pass ? passConfigured : monthlyConfigured;

  return (
    <div className="relative max-w-3xl mx-auto">
      <div
        aria-hidden
        className="absolute -inset-px rounded-sm bg-gradient-to-b from-[#B8860B]/40 to-[#B8860B]/10 blur-[2px]"
      />
      <div className="relative bg-[#0A2647] text-white rounded-sm border border-[#B8860B]/50 shadow-[0_24px_70px_-30px_rgba(10,38,71,0.7)] overflow-hidden">
        <div aria-hidden className="h-1 w-full bg-gradient-to-r from-[#B8860B] via-[#d4a017] to-[#B8860B]" />

        <div className="p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-[#B8860B]/15 text-[#e7c66a] text-xs font-medium tracking-[0.14em] uppercase">
                <InfinityIcon className="w-3.5 h-3.5" strokeWidth={2} />
                Unlimited
              </div>
              <h3 className="font-serif text-3xl sm:text-4xl font-light mt-4 leading-tight">
                Everything, unlimited
              </h3>
              <p className="text-white/60 font-light mt-2 max-w-sm">
                For an active job search — score, tailor, and export as much as you want,
                across every role you apply to.
              </p>
            </div>

            {/* Billing toggle — the signature control */}
            <div className="flex-shrink-0">
              <div className="inline-flex items-center p-1 rounded-sm bg-white/10 border border-white/15">
                <button
                  type="button"
                  onClick={() => setPass(false)}
                  aria-pressed={!pass}
                  className={`px-3.5 py-1.5 rounded-sm text-sm transition-colors ${
                    !pass ? "bg-white text-[#0A2647] font-medium" : "text-white/70 hover:text-white"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setPass(true)}
                  aria-pressed={pass}
                  className={`px-3.5 py-1.5 rounded-sm text-sm transition-colors ${
                    pass ? "bg-white text-[#0A2647] font-medium" : "text-white/70 hover:text-white"
                  }`}
                >
                  3-month pass
                </button>
              </div>
              <div className="mt-2 text-right">
                <span
                  className={`inline-block text-[11px] font-medium tracking-wide text-[#e7c66a] transition-opacity duration-200 ${
                    pass ? "opacity-100" : "opacity-0"
                  }`}
                >
                  Save $60 — covers a whole search
                </span>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="mt-6 flex items-baseline gap-3 flex-wrap">
            <span className="font-serif text-6xl font-light tabular-nums">
              ${pass ? "30" : "50"}
            </span>
            <span className="text-white/55 font-light">/ month</span>
            <span className="text-sm text-white/45 font-light">
              {pass ? (
                <>
                  <span className="text-white/70">$90</span> once for 3 months ·{" "}
                  <span className="line-through text-white/35">$150</span>
                </>
              ) : (
                "billed monthly · cancel anytime"
              )}
            </span>
          </div>

          {/* Features */}
          <ul className="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#e7c66a] flex-shrink-0 mt-0.5" strokeWidth={2} />
                <span className="text-white/85 font-light">{f}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="mt-9">
            {configured ? (
              <Link
                href={`/api/checkout/polar?plan=${plan}`}
                onClick={() => track("checkout_started", { plan })}
                className="group w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-[#B8860B] hover:bg-[#a3760a] text-white font-medium rounded-sm transition-colors tracking-wide"
              >
                {pass ? "Get the 3-month pass" : "Go Unlimited"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.8} />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                title="Available soon"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-white/10 text-white/60 font-medium rounded-sm cursor-not-allowed border border-white/15"
              >
                Coming soon
              </button>
            )}
            <p className="text-center text-xs text-white/40 font-light mt-3">
              {pass
                ? "$90 billed once. 3 months of unlimited — no auto-renew."
                : "$50 billed today, then monthly. Cancel anytime — keep access through the period you paid for."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, X, Zap, Sparkles, Crown, ArrowRight, Check } from "lucide-react";
import { track } from "@/lib/analytics";

type Trigger = "optimize" | "template_unlock" | "balance_click" | "manual";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Reason the modal opened — sent to PostHog so we can split conversion by trigger */
  trigger?: Trigger;
  /** Replaces the default headline. e.g. "Unlock the Modern template" */
  title?: string;
  /** Replaces the default subhead */
  subtitle?: string;
};

type Tier = {
  key: "onemore" | "starter" | "pro";
  name: string;
  price: string;
  credits: number;
  per: string;
  features: string[];
  Icon: typeof Zap;
  highlight?: "primary" | "value";
  badge?: string;
};

const TIERS: Tier[] = [
  {
    key: "onemore",
    name: "1 More Credit",
    price: "$1",
    credits: 1,
    per: "one-off",
    features: ["Try one more analysis", "Or unlock one premium template"],
    Icon: Zap,
    highlight: "primary",
    badge: "JUST $1",
  },
  {
    key: "starter",
    name: "Starter Pack",
    price: "$3",
    credits: 5,
    per: "$0.60 / credit",
    features: ["5 optimizations", "All premium templates", "PDF + DOCX export"],
    Icon: Sparkles,
    highlight: "value",
    badge: "BEST VALUE",
  },
  {
    key: "pro",
    name: "Pro Pack",
    price: "$9",
    credits: 20,
    per: "$0.45 / credit",
    features: ["20 optimizations", "All premium templates", "Cover letters"],
    Icon: Crown,
  },
];

export function OutOfCreditsModal({
  open,
  onClose,
  trigger = "manual",
  title,
  subtitle,
}: Props) {
  const [loadingPlan, setLoadingPlan] = useState<Tier["key"] | null>(null);

  useEffect(() => {
    if (!open) return;
    track("out_of_credits_modal_shown", { trigger });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, trigger, onClose]);

  const handleBuy = (plan: Tier["key"]) => {
    track("pricing_clicked", { source: "out_of_credits_modal", plan, trigger });
    setLoadingPlan(plan);
    // Hard navigation — checkout route is a redirect handler
    window.location.href = `/api/checkout/polar?plan=${plan}`;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="ooc-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ooc-title"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-[#0A2647]/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative w-full max-w-3xl bg-white rounded-sm shadow-modal overflow-hidden max-h-[92vh] overflow-y-auto"
          >
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-stone-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2647]/30"
            >
              <X className="w-4 h-4 text-stone-500" strokeWidth={2} />
            </button>

            {/* Header */}
            <div className="relative px-6 sm:px-10 pt-10 pb-7 bg-gradient-to-br from-[#FAFAF8] via-white to-stone-50 border-b border-stone-100 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#B8860B]/10 mb-4">
                <Coins className="w-6 h-6 text-[#B8860B]" strokeWidth={2} />
              </div>
              <h2
                id="ooc-title"
                className="font-serif text-2xl sm:text-3xl font-light text-[#1a1a1a] tracking-tight mb-2"
              >
                {title ?? "You're out of credits"}
              </h2>
              <p className="text-sm sm:text-base text-stone-500 font-light max-w-md mx-auto">
                {subtitle ??
                  "Top up to keep going. Start with $1 — no commitment, no subscription."}
              </p>
            </div>

            {/* Tier grid */}
            <div className="px-6 sm:px-10 py-8 grid sm:grid-cols-3 gap-4">
              {TIERS.map((tier) => {
                const isPrimary = tier.highlight === "primary";
                const isValue = tier.highlight === "value";
                const loading = loadingPlan === tier.key;
                const TierIcon = tier.Icon;
                return (
                  <div
                    key={tier.key}
                    className={`relative flex flex-col rounded-sm p-5 sm:p-6 border transition-all ${
                      isPrimary
                        ? "border-[#B8860B] bg-gradient-to-br from-[#B8860B]/5 to-white shadow-lift ring-2 ring-[#B8860B]/30"
                        : isValue
                          ? "border-[#0A2647] bg-white shadow-card"
                          : "border-stone-200 bg-white hover:border-stone-300"
                    }`}
                  >
                    {tier.badge && (
                      <span
                        className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase rounded-sm whitespace-nowrap ${
                          isPrimary
                            ? "bg-[#B8860B] text-white"
                            : "bg-[#0A2647] text-white"
                        }`}
                      >
                        {tier.badge}
                      </span>
                    )}

                    <div className="flex items-center gap-2.5 mb-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          isPrimary
                            ? "bg-[#B8860B]/15"
                            : isValue
                              ? "bg-[#0A2647]/10"
                              : "bg-stone-100"
                        }`}
                      >
                        <TierIcon
                          className={`w-4 h-4 ${
                            isPrimary
                              ? "text-[#B8860B]"
                              : isValue
                                ? "text-[#0A2647]"
                                : "text-stone-500"
                          }`}
                          strokeWidth={2}
                        />
                      </div>
                      <div className="font-serif text-base text-[#1a1a1a] tracking-tight">
                        {tier.name}
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="font-serif text-3xl sm:text-4xl text-[#1a1a1a]">
                        {tier.price}
                      </span>
                      <span className="text-xs text-stone-500 font-light">
                        / {tier.credits} credit{tier.credits === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 font-light mb-4 tracking-wide">
                      {tier.per}
                    </p>

                    <ul className="flex-1 space-y-2 mb-5">
                      {tier.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-xs text-stone-600 font-light leading-snug">
                          <Check className="w-3.5 h-3.5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={2} />
                          {feat}
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => handleBuy(tier.key)}
                      disabled={loading}
                      className={`group inline-flex items-center justify-center gap-2 w-full py-2.5 sm:py-3 text-sm font-medium rounded-sm transition-all tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-70 disabled:cursor-wait ${
                        isPrimary
                          ? "bg-[#B8860B] hover:bg-[#9c7409] text-white focus-visible:ring-[#B8860B]/40 shadow-sm hover:shadow-md"
                          : isValue
                            ? "bg-[#0A2647] hover:bg-[#0d3259] text-white focus-visible:ring-[#0A2647]/40 shadow-sm hover:shadow-md"
                            : "bg-white hover:bg-stone-50 text-[#0A2647] border border-stone-300 hover:border-[#0A2647]/50 focus-visible:ring-stone-300"
                      }`}
                    >
                      {loading ? (
                        <span>Redirecting…</span>
                      ) : (
                        <>
                          {isPrimary ? "Get 1 Credit" : isValue ? "Get Starter" : "Get Pro"}
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footnote */}
            <div className="px-6 sm:px-10 pb-7 pt-1 text-center">
              <p className="text-[11px] sm:text-xs text-stone-400 font-light tracking-wide flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <Check className="w-3 h-3 text-[#0A2647]" strokeWidth={2} />
                  Secure checkout via Polar
                </span>
                <span className="text-stone-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <Check className="w-3 h-3 text-[#0A2647]" strokeWidth={2} />
                  No subscription
                </span>
                <span className="text-stone-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <Check className="w-3 h-3 text-[#0A2647]" strokeWidth={2} />
                  Credits never expire
                </span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Convenience hook: returns the modal's open state + helpers + a Trigger-aware open() */
export function useOutOfCreditsModal() {
  const [state, setState] = useState<{
    open: boolean;
    trigger?: Trigger;
    title?: string;
    subtitle?: string;
  }>({ open: false });

  return {
    isOpen: state.open,
    trigger: state.trigger,
    title: state.title,
    subtitle: state.subtitle,
    open: (opts: { trigger?: Trigger; title?: string; subtitle?: string } = {}) =>
      setState({ open: true, ...opts }),
    close: () => setState({ open: false }),
  };
}

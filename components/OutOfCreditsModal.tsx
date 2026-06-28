"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, X, Zap, Sparkles, Crown, ArrowRight, Check, Gift } from "lucide-react";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/LanguageProvider";

// Shape returned by /api/welcome-offer (the 24h post-signup flash). The same
// honest, server-anchored offer that powers the bottom banner — surfaced here at
// peak intent (the user just hit the paywall) instead of inventing a second timer.
type WelcomeOffer = {
  eligible: boolean;
  endsAt?: string;
  credits?: number;
  price?: number;
  anchor?: number;
};

function fmtCountdown(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

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
  const { t } = useT();
  const [loadingPlan, setLoadingPlan] = useState<Tier["key"] | null>(null);
  const [socialProofCount, setSocialProofCount] = useState<number | null>(null);
  const [welcome, setWelcome] = useState<WelcomeOffer | null>(null);
  const [remaining, setRemaining] = useState("");
  const flashTracked = useRef(false);

  useEffect(() => {
    if (!open) return;
    track("out_of_credits_modal_shown", { trigger });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        track("out_of_credits_modal_dismissed", { trigger, source: "escape" });
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, trigger, onClose]);

  useEffect(() => {
    if (!open || socialProofCount !== null) return;
    let cancelled = false;
    fetch("/api/stats/active-users", { cache: "force-cache" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (typeof data?.display === "number") setSocialProofCount(data.display);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, socialProofCount]);

  // Pull the welcome flash once when the modal opens. If the user is eligible
  // (signed up <24h ago, no purchase yet) we lead with it — best offer, real
  // countdown, at the exact moment intent peaks.
  useEffect(() => {
    if (!open || welcome !== null) return;
    let cancelled = false;
    fetch("/api/welcome-offer")
      .then((r) => r.json())
      .then((d: WelcomeOffer) => {
        if (!cancelled) setWelcome(d ?? { eligible: false });
      })
      .catch(() => {
        if (!cancelled) setWelcome({ eligible: false });
      });
    return () => {
      cancelled = true;
    };
  }, [open, welcome]);

  // Tick the countdown while the flash is live. Anchored to the server-provided
  // endsAt, so it can't be reset by reopening the modal — honest urgency.
  useEffect(() => {
    if (!open || !welcome?.eligible || !welcome.endsAt) return;
    const end = new Date(welcome.endsAt).getTime();
    const tick = () => {
      const ms = end - Date.now();
      if (ms <= 0) {
        setWelcome({ eligible: false });
        return;
      }
      setRemaining(fmtCountdown(ms));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [open, welcome]);

  // Fire the analytics impression once per open, when the flash actually shows.
  useEffect(() => {
    if (!open) {
      flashTracked.current = false;
      return;
    }
    if (welcome?.eligible && !flashTracked.current) {
      flashTracked.current = true;
      track("welcome_flash_shown", { source: "out_of_credits_modal", trigger });
    }
  }, [open, welcome, trigger]);

  const handleBuy = (plan: Tier["key"]) => {
    const tier = TIERS.find((t) => t.key === plan);
    track("pricing_clicked", { source: "out_of_credits_modal", plan, trigger });
    track("checkout_started", {
      source: "out_of_credits_modal",
      plan,
      trigger,
      price: tier?.price ?? null,
      credits: tier?.credits ?? null,
    });
    setLoadingPlan(plan);
    // Hard navigation — checkout route is a redirect handler
    window.location.href = `/api/checkout/polar?plan=${plan}`;
  };

  const handleClaimFlash = () => {
    track("pricing_clicked", { source: "out_of_credits_modal", plan: "welcome", trigger });
    track("checkout_started", {
      source: "out_of_credits_modal",
      plan: "welcome",
      trigger,
      price: welcome?.price ?? null,
      credits: welcome?.credits ?? null,
    });
    setLoadingPlan("onemore"); // reuse the loading lock; any value disables the grid
    window.location.href = "/api/checkout/polar?plan=welcome";
  };

  const handleDismiss = (source: "backdrop" | "x_button" | "escape") => {
    track("out_of_credits_modal_dismissed", { trigger, source });
    onClose();
  };

  const flashLive = Boolean(welcome?.eligible && remaining);

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
            aria-label={t("Close")}
            onClick={() => handleDismiss("backdrop")}
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
              onClick={() => handleDismiss("x_button")}
              aria-label={t("Close modal")}
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
                {title ?? t("You're out of credits")}
              </h2>
              <p className="text-sm sm:text-base text-stone-500 font-light max-w-md mx-auto">
                {subtitle ??
                  t("Top up to keep going. Start with $1 — no commitment, no subscription.")}
              </p>
              {socialProofCount !== null && (
                <p className="mt-3 text-[11px] sm:text-xs text-stone-400 font-light tracking-wide">
                  {t("Trusted by {count}+ job seekers in the last 30 days", { count: socialProofCount.toLocaleString() })}
                </p>
              )}
            </div>

            {/* Welcome flash — only for users still inside their honest 24h window.
                Best offer in the app, surfaced at the exact moment they hit the wall. */}
            {flashLive && (
              <div className="px-6 sm:px-10 pt-6">
                <div className="relative overflow-hidden rounded-sm bg-[#0A2647] text-white border border-[#B8860B]/60 shadow-[0_18px_44px_-18px_rgba(10,38,71,0.65)]">
                  <div aria-hidden className="h-1 w-full bg-gradient-to-r from-[#B8860B] via-[#d4a017] to-[#B8860B]" />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-5">
                    <span className="grid place-items-center h-11 w-11 rounded-sm bg-[#B8860B]/15 text-[#e7c66a] flex-shrink-0">
                      <Gift className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm sm:text-base font-medium leading-tight">
                        {t("Your welcome offer — {credits} credits for ${price}", { credits: welcome?.credits ?? 10, price: welcome?.price ?? 3 })}{" "}
                        <span className="text-white/45 line-through font-normal">${welcome?.anchor ?? 10}</span>
                      </div>
                      <div className="text-xs text-[#e7c66a] mt-1">
                        {t("70% off · ends in")} <span className="tabular-nums">{remaining}</span> {t("— won't come back")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClaimFlash}
                      disabled={loadingPlan !== null}
                      className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-sm bg-[#B8860B] hover:bg-[#a3760a] text-white text-sm font-medium transition-colors disabled:opacity-70 disabled:cursor-wait"
                    >
                      {loadingPlan ? t("Redirecting…") : (
                        <>
                          {t("Claim offer")}
                          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <p className="mt-5 mb-0 text-center text-[11px] uppercase tracking-[0.18em] text-stone-400 font-medium">
                  {t("Or top up anytime")}
                </p>
              </div>
            )}

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
                        {t(tier.badge)}
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
                        {t(tier.name)}
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="font-serif text-3xl sm:text-4xl text-[#1a1a1a]">
                        {tier.price}
                      </span>
                      <span className="text-xs text-stone-500 font-light">
                        {tier.credits === 1
                          ? t("/ {credits} credit", { credits: tier.credits })
                          : t("/ {credits} credits", { credits: tier.credits })}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 font-light mb-4 tracking-wide">
                      {t(tier.per)}
                    </p>

                    <ul className="flex-1 space-y-2 mb-5">
                      {tier.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-xs text-stone-600 font-light leading-snug">
                          <Check className="w-3.5 h-3.5 text-[#0A2647] flex-shrink-0 mt-0.5" strokeWidth={2} />
                          {t(feat)}
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
                        <span>{t("Redirecting…")}</span>
                      ) : (
                        <>
                          {isPrimary ? t("Get 1 Credit") : isValue ? t("Get Starter") : t("Get Pro")}
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
                  {t("Secure checkout via Polar")}
                </span>
                <span className="text-stone-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <Check className="w-3 h-3 text-[#0A2647]" strokeWidth={2} />
                  {t("No subscription")}
                </span>
                <span className="text-stone-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <Check className="w-3 h-3 text-[#0A2647]" strokeWidth={2} />
                  {t("Credits never expire")}
                </span>
                <span className="text-stone-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <Check className="w-3 h-3 text-[#0A2647]" strokeWidth={2} />
                  {t("Unused credits refundable")}
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

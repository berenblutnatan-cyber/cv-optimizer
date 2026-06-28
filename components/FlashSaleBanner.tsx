"use client";

// Engagement flash-sale banner. Stays hidden until the builder ARMS the offer
// (a few real actions → useFlashSaleStore), then shows a one-time, 5-minute,
// 80%-off-Pro deal with a live m:ss countdown. The window is owned by the store
// (anchored to armedAt, persisted), so a refresh keeps the same clock ticking
// and, once it ends, it never returns. Distinct gold treatment so it doesn't
// read as the navy 24h welcome banner.

import { useEffect, useRef, useState } from "react";
import { Zap, X, ArrowRight } from "lucide-react";
import { track } from "@/lib/analytics";
import { useFlashSaleStore, FLASH_WINDOW_MS } from "@/stores/flashSaleStore";
import { useT } from "@/lib/i18n/LanguageProvider";

type Offer = {
  available: boolean;
  plan?: string;
  price?: number;
  anchor?: number;
  credits?: number;
  off?: number;
};

function fmtClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "$1.80" but "$9" — show cents only when there are any. */
function fmtPrice(n: number): string {
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}

export function FlashSaleBanner() {
  const { t } = useT();
  const status = useFlashSaleStore((s) => s.status);
  const armedAt = useFlashSaleStore((s) => s.armedAt);
  const expire = useFlashSaleStore((s) => s.expire);
  const dismiss = useFlashSaleStore((s) => s.dismiss);
  const markClaimed = useFlashSaleStore((s) => s.markClaimed);

  const [offer, setOffer] = useState<Offer | null>(null);
  const [remaining, setRemaining] = useState("");
  const shownTracked = useRef(false);

  const live = status === "armed" && armedAt != null;

  // Check eligibility once the flash arms (product configured, not already paid,
  // not inside the welcome window). If ineligible, silently end it.
  useEffect(() => {
    if (!live || offer !== null) return;
    let cancelled = false;
    fetch("/api/flash-sale")
      .then((r) => r.json())
      .then((d: Offer) => {
        if (cancelled) return;
        setOffer(d ?? { available: false });
        if (!d?.available) dismiss();
      })
      .catch(() => {
        if (!cancelled) setOffer({ available: false });
      });
    return () => {
      cancelled = true;
    };
  }, [live, offer, dismiss]);

  // Tick the 5-minute countdown, anchored to armedAt so a refresh can't reset it.
  useEffect(() => {
    if (!live || armedAt == null) return;
    const end = armedAt + FLASH_WINDOW_MS;
    const tick = () => {
      const ms = end - Date.now();
      if (ms <= 0) {
        expire();
        return;
      }
      setRemaining(fmtClock(ms));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [live, armedAt, expire]);

  const visible = live && offer?.available === true && remaining !== "";

  // Impression — once, when the banner actually shows.
  useEffect(() => {
    if (visible && !shownTracked.current) {
      shownTracked.current = true;
      track("flash_sale_shown", { plan: "pro_flash" });
    }
  }, [visible]);

  if (!visible) return null;

  const price = offer?.price ?? 1.8;
  const anchor = offer?.anchor ?? 9;
  const credits = offer?.credits ?? 20;
  const off = offer?.off ?? 80;

  function claim() {
    track("checkout_started", {
      source: "flash_sale_banner",
      plan: "pro_flash",
      price,
      credits,
    });
    markClaimed();
    // Hard navigation — the checkout route is a redirect handler (and bounces
    // anon users through sign-in, preserving ?plan=pro_flash).
    window.location.href = "/api/checkout/polar?plan=pro_flash";
  }

  function close() {
    track("flash_sale_dismissed", { plan: "pro_flash" });
    dismiss();
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-[60] px-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-xl rounded-sm bg-white text-[#0A2647] shadow-[0_24px_60px_-20px_rgba(184,134,11,0.55)] border border-[#B8860B]/60 overflow-hidden">
        <div aria-hidden className="h-1 w-full bg-gradient-to-r from-[#B8860B] via-[#d4a017] to-[#B8860B]" />
        <div className="flex items-center gap-3 sm:gap-4 px-4 py-3">
          <span className="grid place-items-center h-10 w-10 rounded-sm bg-[#B8860B] text-white flex-shrink-0">
            <Zap className="h-5 w-5" strokeWidth={2} fill="currentColor" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold leading-tight flex items-center gap-2">
              <span className="inline-flex items-center rounded-sm bg-[#B8860B]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9c7409]">
                {t("{off}% off", { off })}
              </span>
              {t("Flash sale — Pro")}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              <span className="font-semibold text-[#0A2647]">{fmtPrice(price)}</span>{" "}
              <span className="line-through text-stone-400">{fmtPrice(anchor)}</span> · {t("{credits} credits · ends in", { credits })}{" "}
              <span className="font-semibold tabular-nums text-[#B8860B]">{remaining}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={claim}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-sm bg-[#B8860B] hover:bg-[#a3760a] text-white text-sm font-medium transition-colors"
          >
            {t("Claim")}
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={close}
            aria-label={t("Dismiss offer")}
            className="flex-shrink-0 grid place-items-center h-8 w-8 rounded-sm text-stone-400 hover:text-[#0A2647] hover:bg-stone-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

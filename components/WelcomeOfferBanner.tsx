"use client";

// Bottom floating welcome-flash banner. Self-hides unless the signed-in user is
// eligible (first 24h, no purchase). Honest countdown — anchored server-side to
// createdAt, so it never resets. Dismiss is remembered locally.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gift, X } from "lucide-react";
import { track } from "@/lib/analytics";

const DISMISS_KEY = "welcome-offer-dismissed";

type Offer = {
  eligible: boolean;
  endsAt?: string;
  credits?: number;
  price?: number;
  anchor?: number;
};

function fmt(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export function WelcomeOfferBanner() {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [dismissed, setDismissed] = useState(true); // hidden until we know
  const [remaining, setRemaining] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
    fetch("/api/welcome-offer")
      .then((r) => r.json())
      .then((d: Offer) => setOffer(d))
      .catch(() => setOffer({ eligible: false }));
  }, []);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (!offer?.eligible || !offer.endsAt) return;
    const end = new Date(offer.endsAt).getTime();
    const tick = () => {
      const ms = end - Date.now();
      if (ms <= 0) {
        setOffer({ eligible: false });
        return;
      }
      setRemaining(fmt(ms));
    };
    tick();
    timer.current = setInterval(tick, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [offer]);

  if (!offer?.eligible || dismissed) return null;

  const { credits = 10, price = 3, anchor = 10 } = offer;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-[60] px-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-xl rounded-sm bg-[#0A2647] text-white shadow-[0_24px_60px_-20px_rgba(10,38,71,0.7)] border border-[#B8860B]/50 overflow-hidden">
        <div aria-hidden className="h-1 w-full bg-gradient-to-r from-[#B8860B] via-[#d4a017] to-[#B8860B]" />
        <div className="flex items-center gap-3 sm:gap-4 px-4 py-3">
          <span className="grid place-items-center h-10 w-10 rounded-sm bg-[#B8860B]/15 text-[#e7c66a] flex-shrink-0">
            <Gift className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium leading-tight">
              Welcome offer — {credits} credits for ${price}{" "}
              <span className="text-white/45 line-through font-normal">${anchor}</span>
            </div>
            <div className="text-xs text-[#e7c66a] mt-0.5">
              70% off · ends in <span className="tabular-nums">{remaining}</span>
            </div>
          </div>
          <Link
            href="/api/checkout/polar?plan=welcome"
            onClick={() => track("checkout_started", { plan: "welcome" })}
            className="flex-shrink-0 inline-flex items-center px-4 py-2 rounded-sm bg-[#B8860B] hover:bg-[#a3760a] text-white text-sm font-medium transition-colors"
          >
            Claim
          </Link>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss offer"
            className="flex-shrink-0 grid place-items-center h-8 w-8 rounded-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

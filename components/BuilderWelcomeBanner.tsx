"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Sparkles, X } from "lucide-react";
import { track } from "@/lib/analytics";

const DISMISS_KEY = "hired-cv:builder-welcome-dismissed";

export function BuilderWelcomeBanner() {
  const { userId, isLoaded } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isLoaded || !userId) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    let cancelled = false;
    fetch("/api/get-credits", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const n = typeof data?.credits === "number" ? data.credits : null;
        setCredits(n);
        if (n !== null && n > 0) {
          setShow(true);
          track("builder_welcome_viewed", { credits: n });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId]);

  if (!show || credits === null) return null;

  const dismiss = () => {
    setShow(false);
    track("builder_welcome_dismissed", { credits: credits ?? 0 });
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  return (
    <div className="px-8 lg:px-16 pt-4">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex items-start sm:items-center justify-between gap-4 px-5 py-3 rounded-sm bg-[#0A2647]/5 border border-[#0A2647]/15">
          <div className="flex items-start sm:items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#0A2647] flex-shrink-0 mt-0.5 sm:mt-0" strokeWidth={1.5} />
            <p className="text-sm text-[#1a1a1a] font-light leading-relaxed">
              <span className="font-medium">Welcome to Hired-CV.</span>{" "}
              You have <span className="font-medium text-[#0A2647]">{credits} {credits === 1 ? "credit" : "credits"}</span> ready to use. Each credit unlocks one AI-optimized resume download.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="flex-shrink-0 p-1 -m-1 text-stone-400 hover:text-stone-700 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

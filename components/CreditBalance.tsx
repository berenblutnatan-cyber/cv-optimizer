"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Coins } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";

export function CreditBalance() {
  const { t } = useT();
  const { userId, isLoaded } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Fetch credits function - don't set loading state on refresh
  const fetchCredits = useCallback(async (isInitial = false) => {
    if (!userId) {
      setCredits(null);
      setIsInitialLoading(false);
      return;
    }

    try {
      if (isInitial) {
        setIsInitialLoading(true);
      }
      const response = await fetch("/api/get-credits", {
        cache: "no-store", // Ensure fresh data
      });
      const data = await response.json();
      setCredits(data.credits ?? 0);
    } catch (error) {
      console.error("Failed to fetch credit balance:", error);
      // Only set to 0 if we don't have a value yet
      setCredits((prev) => prev ?? 0);
    } finally {
      if (isInitial) {
        setIsInitialLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (!isLoaded) {
      setIsInitialLoading(true);
      return;
    }

    // Initial load
    fetchCredits(true);
    if (!userId) return;

    // Gentle background refresh: once a minute, and ONLY while the tab is
    // actually visible — ~90% of traffic is mobile, where an aggressive
    // interval burns battery and data for nothing.
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchCredits(false);
      }
    }, 60_000);

    // Refetch immediately when the user comes back to the tab (e.g. returning
    // from checkout or a backgrounded browser) so the balance is never stale
    // at the moment it matters.
    const refresh = () => fetchCredits(false);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchCredits(false);
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    // App-level hook: anything that changes the balance (purchase success,
    // credit spend) can dispatch `credits:refresh` to update the pill at once.
    window.addEventListener("credits:refresh", refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("credits:refresh", refresh);
    };
  }, [userId, isLoaded, fetchCredits]);

  // Always render a container with fixed dimensions to prevent layout shift
  const baseClass =
    "inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-sm text-sm font-medium transition-all focus-visible:outline-none";
  const minWidth = "min-w-[3.5rem] sm:min-w-[7rem]";

  if (!isLoaded || (isInitialLoading && credits === null) || !userId) {
    return (
      <div className={`${baseClass} ${minWidth} bg-transparent pointer-events-none`} aria-hidden="true">
        <Coins className="w-4 h-4 opacity-0" strokeWidth={2} />
        <span className="opacity-0">0</span>
      </div>
    );
  }

  const displayCredits = credits ?? 0;
  const isEmpty = displayCredits === 0;
  const label = displayCredits === 1 ? t("Credit") : t("Credits");

  // When credits are 0, switch to a red/urgent style with "Add credits" hint.
  const styleClasses = isEmpty
    ? "bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 hover:border-red-300"
    : "bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold hover:text-brand-navy border border-brand-gold/30 hover:border-brand-gold/50";

  return (
    <Link
      href="/pricing"
      className={`${baseClass} ${minWidth} ${styleClasses}`}
      aria-label={
        isEmpty
          ? t("Out of credits — open pricing")
          : t("{count} {label} — view pricing", { count: displayCredits, label })
      }
      title={isEmpty ? t("Out of credits — view pricing") : t("Credit balance — view pricing")}
    >
      <Coins className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
      {isEmpty ? (
        <>
          <span className="hidden sm:inline text-xs font-medium">{t("Add credits")}</span>
          <span className="sm:hidden text-xs font-semibold">{t("Add")}</span>
        </>
      ) : (
        <>
          <span className="tabular-nums font-semibold">{displayCredits}</span>
          <span className="hidden sm:inline text-xs font-light">{label}</span>
        </>
      )}
    </Link>
  );
}

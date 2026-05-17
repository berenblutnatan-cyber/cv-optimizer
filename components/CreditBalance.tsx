"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Coins } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

export function CreditBalance() {
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
      if (credits === null) {
        setCredits(0);
      }
    } finally {
      if (isInitial) {
        setIsInitialLoading(false);
      }
    }
  }, [userId, credits]);

  useEffect(() => {
    if (!isLoaded) {
      setIsInitialLoading(true);
      return;
    }

    // Initial load
    fetchCredits(true);

    // Auto-refresh every 5 seconds to catch manual DB updates
    // Don't show loading state during refresh - keep current value visible
    const interval = setInterval(() => {
      if (userId) {
        fetchCredits(false);
      }
    }, 5000);

    return () => clearInterval(interval);
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
  const label = displayCredits === 1 ? "Credit" : "Credits";

  // When credits are 0, switch to a red/urgent style with "Add credits" hint.
  const styleClasses = isEmpty
    ? "bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 hover:border-red-300"
    : "bg-[#B8860B]/10 hover:bg-[#B8860B]/20 text-[#B8860B] hover:text-[#0A2647] border border-[#B8860B]/30 hover:border-[#B8860B]/50";

  return (
    <Link
      href="/pricing"
      className={`${baseClass} ${minWidth} ${styleClasses}`}
      aria-label={
        isEmpty
          ? "Out of credits — open pricing"
          : `${displayCredits} ${label} — view pricing`
      }
      title={isEmpty ? "Out of credits — view pricing" : "Credit balance — view pricing"}
    >
      <Coins className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
      {isEmpty ? (
        <>
          <span className="hidden sm:inline text-xs font-medium">Add credits</span>
          <span className="sm:hidden text-xs font-semibold">Add</span>
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

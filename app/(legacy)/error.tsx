"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { reloadOnceOnChunkError } from "@/lib/chunkRecovery";

/**
 * Route-level error boundary — the branded, recoverable version of a crash.
 *
 * Unlike global-error.tsx (which replaces the whole document when the root
 * layout itself fails), this renders INSIDE the root layout, so the i18n
 * provider, fonts, and styles are all still available. Most of our traffic is
 * mobile in-app browsers where a blank "something broke" dead-ends the whole
 * visit — so we keep it calm, offer a real retry, and always leave a way home.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useT();

  useEffect(() => {
    console.error("route error boundary:", error);
    // Stale-deploy chunk failures self-heal with one hard reload (guarded
    // against loops) — same recovery global-error.tsx uses.
    reloadOnceOnChunkError(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#FAFAF8] px-5 py-16 text-center text-brand-navy">
      <p className="font-mono text-xs uppercase tracking-[0.28em] text-brand-gold">
        {t("A hiccup, not a dead end")}
      </p>
      <h1 className="mt-4 max-w-lg text-balance font-serif text-3xl leading-[1.1] sm:text-4xl">
        {t("Something went wrong on our side.")}
      </h1>
      <p className="mx-auto mt-4 max-w-md text-pretty text-base leading-relaxed text-brand-navy/60">
        {t("Your CV draft is safe on this device. Try again — it usually clears right up.")}
      </p>
      <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-11 items-center gap-2.5 rounded-full bg-brand-gold-soft px-8 py-3.5 text-sm font-semibold text-brand-navy shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
          {t("Try again")}
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-full px-4 py-3.5 text-sm font-medium text-brand-navy/55 underline-offset-4 transition-colors hover:text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2"
        >
          {t("Back to the home page")}
        </Link>
      </div>
      {error?.digest && (
        <p className="mt-10 font-mono text-[11px] tracking-wide text-brand-navy/35">
          {t("Error code")}: {error.digest}
        </p>
      )}
    </main>
  );
}

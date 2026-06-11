"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Check, ArrowRight, RotateCcw } from "lucide-react";
import { reloadOnceOnChunkError } from "@/lib/chunkRecovery";

/**
 * Scoped boundary for /purchase-success. The user has already paid by the
 * time anything here can throw, so the fallback must reassure first and
 * offer recovery second — never a generic "application error".
 */
export default function PurchaseSuccessError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("purchase-success error boundary:", error);
    reloadOnceOnChunkError(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1a1a1a] flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center">
        <div className="w-20 h-20 rounded-full bg-[#0A2647] flex items-center justify-center mx-auto mb-8">
          <Check className="w-10 h-10 text-white" strokeWidth={2} />
        </div>

        <h1 className="font-serif text-4xl font-light mb-4">Payment received.</h1>
        <div className="w-16 h-px bg-[#0A2647] mx-auto mb-6" />
        <p className="text-lg text-stone-600 font-light mb-10">
          Your purchase went through and your credits are safe — this page just
          had trouble loading.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 border border-stone-300 hover:border-stone-400 text-stone-700 font-medium rounded-sm transition-all"
          >
            <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
            Reload this page
          </button>
          <Link
            href="/builder"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A2647] hover:bg-[#0d3259] text-white font-medium rounded-sm transition-all"
          >
            Optimize My Resume Now
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>

        <p className="text-sm text-stone-500 mt-8 font-light">
          A receipt has been sent to your email. Credits never expire.
        </p>
      </div>
    </div>
  );
}

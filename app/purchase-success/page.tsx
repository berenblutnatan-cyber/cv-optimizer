"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { POLAR_PLANS, type PolarPlanKey } from "@/lib/polar";
import { trackConversion } from "@/lib/gtag";
import { trackMetaEvent } from "@/lib/fbq";

function PurchaseSuccessContent() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const hasFired = useRef(false);

  const plan = searchParams.get("plan") as PolarPlanKey | null;
  const checkoutId = searchParams.get("checkout_id") ?? undefined;
  const planConfig = plan ? POLAR_PLANS[plan] : null;

  useEffect(() => {
    if (hasFired.current || !planConfig) return;
    hasFired.current = true;
    trackConversion("purchase", {
      value: planConfig.amount,
      currency: "USD",
      transaction_id: checkoutId,
      user_email: user?.emailAddresses[0]?.emailAddress,
    });
    trackMetaEvent("Purchase", {
      value: planConfig.amount,
      currency: "USD",
      content_name: planConfig.name,
      content_ids: [plan ?? "unknown"],
      num_items: 1,
    });
  }, [planConfig, plan, checkoutId, user]);

  return (
    <div className="max-w-xl w-full text-center">
      <div className="w-20 h-20 rounded-full bg-[#0A2647] flex items-center justify-center mx-auto mb-8">
        <Check className="w-10 h-10 text-white" strokeWidth={2} />
      </div>

      <h1 className="font-serif text-4xl font-light mb-4">
        You're in.
      </h1>
      <div className="w-16 h-px bg-[#0A2647] mx-auto mb-6" />
      <p className="text-lg text-stone-600 font-light mb-10">
        {planConfig
          ? `${planConfig.credits} credits added to your account.`
          : "Your purchase is complete."}
      </p>

      <Link
        href="/builder"
        className="inline-flex items-center gap-3 px-8 py-4 bg-[#0A2647] hover:bg-[#0d3259] text-white font-medium rounded-sm transition-all shadow-sm hover:shadow-md tracking-wide"
      >
        <Sparkles className="w-5 h-5" strokeWidth={1.5} />
        Optimize My Resume Now
        <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
      </Link>

      <p className="text-sm text-stone-500 mt-8 font-light">
        A receipt has been sent to your email. Credits never expire.
      </p>
    </div>
  );
}

export default function PurchaseSuccessPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1a1a1a] flex flex-col">
      <header className="w-full px-8 md:px-16 py-6 border-b border-stone-200/60">
        <Logo variant="dark" size="md" />
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <Suspense fallback={null}>
          <PurchaseSuccessContent />
        </Suspense>
      </main>
    </div>
  );
}

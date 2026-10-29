"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Check, ArrowRight, Sparkles, FileText } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PurchaseConfetti } from "@/components/PurchaseConfetti";
import { POLAR_PLANS, planGrantsUnlimited, type PolarPlan, type PolarPlanKey } from "@/lib/polar";
import { trackConversion } from "@/lib/gtag";
import { trackMetaEvent } from "@/lib/fbq";
import { track, setUserProps } from "@/lib/analytics";
import { useT } from "@/lib/i18n/LanguageProvider";

function PurchaseSuccessContent() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const hasFired = useRef(false);

  const plan = searchParams.get("plan") as PolarPlanKey | null;
  const checkoutId = searchParams.get("checkout_id") ?? undefined;
  const planConfig: PolarPlan | null = plan ? (POLAR_PLANS[plan] ?? null) : null;
  // Unlimited plans (monthly subscription + the 3-month pass) grant access, not
  // credits — "0 credits added" would read like the purchase failed.
  const isUnlimited = planConfig ? planGrantsUnlimited(planConfig) : false;
  const passDays = planConfig?.grantsUnlimitedDays ?? 0;

  // If the user hit the paywall mid-optimization, their inputs were stashed as
  // an optimizer draft before checkout. Lead them straight back to that work.
  const [hasOptimizerDraft, setHasOptimizerDraft] = useState(false);
  useEffect(() => {
    try {
      setHasOptimizerDraft(Boolean(localStorage.getItem("optimizer_draft")));
    } catch {
      // localStorage unavailable (privacy mode) — fall back to the builder CTA.
    }
  }, []);

  useEffect(() => {
    if (hasFired.current || !planConfig) return;
    hasFired.current = true;
    // Tracking must never take down the success page — the user already
    // paid. Anything thrown here (pixel scripts hijacked by extensions,
    // partial Clerk user objects, ...) is swallowed.
    try {
      trackConversion("purchase", {
        value: planConfig.amount,
        currency: "USD",
        transaction_id: checkoutId,
        user_email: user?.emailAddresses?.[0]?.emailAddress,
      });
      trackMetaEvent("Purchase", {
        value: planConfig.amount,
        currency: "USD",
        content_name: planConfig.name,
        content_ids: [plan ?? "unknown"],
        num_items: 1,
      });
      track("purchase_completed", {
        plan: plan ?? "unknown",
        amount: planConfig.amount,
        credits: planConfig.credits,
        checkout_id: checkoutId ?? null,
      });
      setUserProps(
        {
          is_paid: true,
          last_paid_plan: plan ?? "unknown",
          last_paid_amount: planConfig.amount,
          last_paid_at: new Date().toISOString(),
        },
        {
          first_paid_at: new Date().toISOString(),
          first_paid_plan: plan ?? "unknown",
        },
      );
    } catch (error) {
      console.error("purchase tracking failed:", error);
    }
  }, [planConfig, plan, checkoutId, user]);

  return (
    <div className="max-w-xl w-full text-center">
      <PurchaseConfetti />
      <div className="w-20 h-20 rounded-full bg-brand-navy flex items-center justify-center mx-auto mb-8">
        <Check className="w-10 h-10 text-white" strokeWidth={2} />
      </div>

      <h1 className="font-serif text-4xl font-light mb-4">
        {t("You're in.")}
      </h1>
      <div className="w-16 h-px bg-brand-navy mx-auto mb-6" />
      <p className="text-lg text-stone-600 font-light mb-10">
        {!planConfig
          ? t("Your purchase is complete.")
          : isUnlimited
            ? passDays > 0
              ? t("Your Job Search Pass is active — {days} days of Unlimited on your account.", { days: passDays })
              : t("Unlimited is now active on your account.")
            : t("{credits} credits added to your account.", { credits: planConfig.credits })}
      </p>

      {hasOptimizerDraft ? (
        <>
          <Link
            href="/optimize"
            className="inline-flex items-center gap-3 px-8 py-4 bg-brand-navy hover:bg-brand-navy-hover text-white font-medium rounded-sm transition-all shadow-sm hover:shadow-md tracking-wide"
          >
            <FileText className="w-5 h-5" strokeWidth={1.5} />
            {t("Continue Your Optimization")}
            <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
          </Link>
          <p className="text-sm text-stone-500 mt-4 font-light">
            {t("Your resume and job details are saved, right where you left off.")}
          </p>
          <div className="mt-4">
            <Link
              href="/builder"
              className="text-sm text-brand-navy hover:text-brand-navy-hover underline underline-offset-4 font-light"
            >
              {t("Or open the Resume Builder →")}
            </Link>
          </div>
        </>
      ) : (
        <Link
          href="/builder"
          className="inline-flex items-center gap-3 px-8 py-4 bg-brand-navy hover:bg-brand-navy-hover text-white font-medium rounded-sm transition-all shadow-sm hover:shadow-md tracking-wide"
        >
          <Sparkles className="w-5 h-5" strokeWidth={1.5} />
          {t("Optimize My Resume Now")}
          <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
        </Link>
      )}

      <p className="text-sm text-stone-500 mt-8 font-light">
        {isUnlimited
          ? passDays > 0
            ? t("A receipt has been sent to your email. No auto-renew — the pass simply ends.")
            : t("A receipt has been sent to your email. Cancel anytime.")
          : t("A receipt has been sent to your email. Credits never expire.")}
      </p>
    </div>
  );
}

export default function PurchaseSuccessPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-brand-ink flex flex-col">
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

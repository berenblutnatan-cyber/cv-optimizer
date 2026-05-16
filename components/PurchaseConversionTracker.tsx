"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { POLAR_PLANS, type PolarPlanKey } from "@/lib/polar";
import { trackConversion } from "@/lib/gtag";

export function PurchaseConversionTracker() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    if (searchParams.get("purchase") !== "success") return;

    const checkoutId = searchParams.get("checkout_id") ?? undefined;
    const plan = searchParams.get("plan") as PolarPlanKey | null;
    const planConfig = plan ? POLAR_PLANS[plan] : null;
    const email = user?.emailAddresses[0]?.emailAddress;

    hasFired.current = true;
    trackConversion("purchase", {
      value: planConfig?.amount,
      currency: "USD",
      transaction_id: checkoutId,
      user_email: email,
    });
  }, [searchParams, user]);

  return null;
}

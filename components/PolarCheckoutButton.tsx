"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import posthog from "posthog-js";
import type { PolarPlanKey } from "@/lib/polar";
import { trackMetaEvent } from "@/lib/fbq";
import { useT } from "@/lib/i18n/LanguageProvider";

interface PolarCheckoutButtonProps {
  plan: PolarPlanKey;
  planName: string;
  amount: number;
  variant?: "primary" | "gold";
}

export function PolarCheckoutButton({
  plan,
  planName,
  amount,
  variant = "primary",
}: PolarCheckoutButtonProps) {
  const { t } = useT();
  const [loading, setLoading] = useState(false);

  const baseClasses =
    "w-full inline-flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-sm transition-all tracking-wide text-center disabled:opacity-80 disabled:cursor-wait";
  const colorClasses =
    variant === "gold"
      ? "bg-[#B8860B] hover:bg-[#9c7409] text-white"
      : "bg-[#0A2647] hover:bg-[#0d3259] text-white";

  const handleClick = () => {
    posthog.capture?.("checkout_clicked", { plan, amount, planName });
    trackMetaEvent("InitiateCheckout", {
      value: amount,
      currency: "USD",
      content_name: planName,
      content_ids: [plan],
      num_items: 1,
    });
    setLoading(true);
    // Hard-navigate so Clerk redirect + Polar handoff work; the loading state
    // keeps the button locked until the new page paints.
    window.location.href = `/api/checkout/polar?plan=${plan}`;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`${baseClasses} ${colorClasses}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
          {t("Redirecting to checkout…")}
        </>
      ) : (
        <>{t("Buy {planName} — ${amount}", { planName: t(planName), amount })}</>
      )}
    </button>
  );
}

export default PolarCheckoutButton;

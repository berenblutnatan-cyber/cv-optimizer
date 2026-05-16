"use client";

import Link from "next/link";
import type { PolarPlanKey } from "@/lib/polar";

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
  const baseClasses =
    "w-full inline-flex items-center justify-center px-6 py-3 font-medium rounded-sm transition-all tracking-wide text-center";
  const colorClasses =
    variant === "gold"
      ? "bg-[#B8860B] hover:bg-[#9c7409] text-white"
      : "bg-[#0A2647] hover:bg-[#0d3259] text-white";

  return (
    <Link
      href={`/api/checkout/polar?plan=${plan}`}
      prefetch={false}
      className={`${baseClasses} ${colorClasses}`}
    >
      Buy {planName} — ${amount}
    </Link>
  );
}

export default PolarCheckoutButton;

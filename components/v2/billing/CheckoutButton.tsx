"use client";

import * as React from "react";
import posthog from "posthog-js";
import { trackMetaEvent } from "@/lib/fbq";
import type { PolarPlanKey } from "@/lib/polar";
import { Button, Tooltip, type ButtonProps } from "@/components/ui";

/**
 * Starts a Polar checkout. Same analytics as the legacy button (PostHog
 * checkout_clicked + Meta InitiateCheckout); returns to /account afterwards.
 */
export function CheckoutButton({
  plan,
  planName,
  amount,
  available,
  children,
  ...props
}: { plan: PolarPlanKey; planName: string; amount: number; available: boolean } & Omit<ButtonProps, "onClick">) {
  const [loading, setLoading] = React.useState(false);
  // Back from Polar via bfcache restores the page with loading still on.
  React.useEffect(() => {
    const onShow = (e: PageTransitionEvent) => e.persisted && setLoading(false);
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const button = (
    <Button
      {...props}
      loading={loading}
      disabled={!available || props.disabled}
      onClick={() => {
        try {
          posthog.capture?.("checkout_clicked", { plan, amount, planName });
          trackMetaEvent("InitiateCheckout", { value: amount, currency: "USD", content_name: planName, content_ids: [plan], num_items: 1 });
        } catch {}
        setLoading(true);
        // A full navigation: sign-in redirects and the Polar handoff need it.
        window.location.href = `/api/checkout/polar?plan=${plan}&return=account`;
      }}
    >
      {children}
    </Button>
  );
  if (available) return button;
  return (
    <Tooltip content="Not on sale right now">
      <span tabIndex={0} className="block w-full">
        {button}
      </span>
    </Tooltip>
  );
}

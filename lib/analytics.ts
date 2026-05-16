"use client";

import posthog from "posthog-js";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    clarity?: (...args: unknown[]) => void;
  }
}

export type EventName =
  | "optimize_page_viewed"
  | "cv_added"
  | "job_context_added"
  | "analyze_clicked"
  | "auth_modal_shown"
  | "optimize_started"
  | "optimize_succeeded"
  | "optimize_failed"
  | "credit_check_failed"
  | "results_viewed"
  | "pricing_clicked";

type EventProps = Record<string, string | number | boolean | null | undefined>;

export function track(event: EventName, props: EventProps = {}) {
  if (typeof window === "undefined") return;

  // PostHog
  try {
    posthog.capture(event, props);
  } catch {
    // posthog may not be initialized yet — ignore
  }

  // Google Analytics / gtag
  try {
    window.gtag?.("event", event, props);
  } catch {
    // ignore
  }

  // Microsoft Clarity custom event + tags
  try {
    window.clarity?.("event", event);
    // tag a few useful filterable dimensions
    for (const [k, v] of Object.entries(props)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        window.clarity?.("set", k, String(v));
      }
    }
  } catch {
    // ignore
  }
}

export function identifyUser(distinctId: string, traits: EventProps = {}) {
  if (typeof window === "undefined") return;
  try {
    posthog.identify(distinctId, traits);
  } catch {
    // ignore
  }
  try {
    if (traits.email && typeof traits.email === "string") {
      window.clarity?.("identify", String(traits.email));
    } else {
      window.clarity?.("identify", distinctId);
    }
  } catch {
    // ignore
  }
}

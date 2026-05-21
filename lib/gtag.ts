export const GOOGLE_ADS_ID = "AW-18163039044";

export const CONVERSION_LABELS = {
  purchase: "M5VrCP727q0cEMT259RD",
  signup: "7YKyCPv27q0cEMT259RD",
  score_generated: "uFJPCIH37q0cEMT259RD",
} as const;

export type ConversionEvent = keyof typeof CONVERSION_LABELS;

type ConversionPayload = {
  value?: number;
  currency?: string;
  transaction_id?: string;
  user_email?: string;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Fire a Google Ads conversion event.
 *
 * Critical: gtag.js is loaded with `strategy="lazyOnload"` for LCP reasons,
 * which means `window.gtag` may not be a function yet when this is called
 * (e.g., `/purchase-success` fires `trackConversion` on mount, often before
 * the lazy gtag.js bundle has finished loading).
 *
 * The previous implementation returned silently when `window.gtag` was
 * unavailable, dropping every conversion event that fired before the lazy
 * load completed. That's why the Purchase goal has stayed "Unverified" in
 * Google Ads despite 3 real paid orders — the gtag conversion event was
 * never actually firing.
 *
 * Fix: push directly to `window.dataLayer` if `window.gtag` isn't ready.
 * gtag.js is designed so any commands queued in `dataLayer` before it loads
 * are replayed once it does, so this preserves every conversion regardless
 * of load order.
 */
export function trackConversion(event: ConversionEvent, payload: ConversionPayload = {}) {
  if (typeof window === "undefined") return;

  const label = CONVERSION_LABELS[event];
  if (!label) return;

  // Ensure dataLayer exists synchronously — gtag.js will pick up queued
  // commands from it when (and if) it eventually loads.
  window.dataLayer = window.dataLayer || [];

  // Resolve a gtag function: real one if loaded, otherwise a dataLayer-push
  // shim with identical semantics for queued commands.
  const gtag: (...args: unknown[]) => void =
    typeof window.gtag === "function"
      ? window.gtag
      : function () {
          // eslint-disable-next-line prefer-rest-params
          window.dataLayer!.push(arguments);
        };

  if (payload.user_email) {
    gtag("set", "user_data", { email: payload.user_email });
  }

  gtag("event", "conversion", {
    send_to: `${GOOGLE_ADS_ID}/${label}`,
    value: payload.value,
    currency: payload.currency,
    transaction_id: payload.transaction_id,
  });
}

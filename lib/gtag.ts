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

export function trackConversion(event: ConversionEvent, payload: ConversionPayload = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  const label = CONVERSION_LABELS[event];
  if (!label) return;

  if (payload.user_email) {
    window.gtag("set", "user_data", { email: payload.user_email });
  }

  window.gtag("event", "conversion", {
    send_to: `${GOOGLE_ADS_ID}/${label}`,
    value: payload.value,
    currency: payload.currency,
    transaction_id: payload.transaction_id,
  });
}

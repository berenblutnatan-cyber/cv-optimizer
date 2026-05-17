export const META_PIXEL_ID = "990697506804808";

export type MetaStandardEvent =
  | "Lead"
  | "CompleteRegistration"
  | "InitiateCheckout"
  | "Purchase"
  | "AddPaymentInfo"
  | "ViewContent";

type MetaEventPayload = {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  num_items?: number;
  status?: string;
  predicted_ltv?: number;
};

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[] };
    _fbq?: unknown;
  }
}

export function trackMetaEvent(event: MetaStandardEvent, payload: MetaEventPayload = {}) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    window.fbq("track", event, payload);
  } catch {
    // ignore
  }
}

export function trackMetaCustomEvent(event: string, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    window.fbq("trackCustom", event, payload);
  } catch {
    // ignore
  }
}

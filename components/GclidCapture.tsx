"use client";

import { useEffect } from "react";

/**
 * Captures the Google Ads click ID (?gclid=...) from the URL on landing and
 * persists it for the lifetime of the click attribution window.
 *
 * Stored in BOTH:
 *  - localStorage   — survives across tabs / sessions on the same browser
 *  - a 90-day cookie — readable by the server in API routes for checkout
 *
 * 90 days matches Google Ads' default click attribution window. Whichever is
 * more recent wins (we always overwrite on a fresh ?gclid in the URL).
 *
 * Why we need this: without storing gclid, the Polar webhook can't include it
 * on the Purchase row, Google Ads can't match the purchase back to the ad
 * click, and the Purchase conversion stays "Unverified" forever.
 *
 * Mount globally in app/layout.tsx — runs once per page load, no UI.
 */
export function GclidCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const gclid = params.get("gclid");
      if (!gclid) return;

      // 90-day expiry. Same value to both stores so they don't drift.
      const ninetyDays = 90 * 24 * 60 * 60;
      const expires = new Date(Date.now() + ninetyDays * 1000).toUTCString();

      window.localStorage.setItem("gclid", gclid);
      window.localStorage.setItem("gclid_captured_at", String(Date.now()));

      // SameSite=Lax so the cookie survives a Polar checkout redirect back to
      // /purchase-success. Secure so we don't leak it in plaintext.
      document.cookie = `gclid=${encodeURIComponent(
        gclid
      )}; path=/; max-age=${ninetyDays}; expires=${expires}; SameSite=Lax; Secure`;
    } catch {
      // Storage may be blocked (private browsing, etc.) — fail silently.
    }
  }, []);

  return null;
}

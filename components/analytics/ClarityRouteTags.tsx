"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { bridgeClarityToPostHog } from "@/lib/analytics";

/**
 * ClarityRouteTags
 *
 * cv-optimizer is a client-rendered SPA, so Microsoft Clarity otherwise lumps a
 * whole session under raw (and sometimes identical) URLs. On every route change
 * this sets a stable, human-readable `page` custom tag, so session replays,
 * heatmaps and Filters become sliceable by logical screen ("Optimize",
 * "Chat Builder", "Results", …) instead of cryptic paths.
 *
 * Renders nothing. Mounted once at the app root.
 */

// Longest-prefix wins, so nested routes inherit their section label
// (e.g. /build/chat → "Chat Builder", /optimize/anything → "Optimize").
const PAGE_LABELS: Record<string, string> = {
  "/optimize": "Optimize",
  "/score": "Score",
  "/build/chat": "Chat Builder",
  "/build": "Builder",
  "/builder": "Builder",
  "/results": "Results",
  "/pricing": "Pricing",
  "/dashboard": "Dashboard",
  "/roles": "Roles",
  "/start": "Start",
  "/welcome": "Welcome",
  "/admin": "Admin",
  "/contact": "Contact",
  "/privacy": "Privacy",
  "/terms": "Terms",
  "/refund-policy": "Refund Policy",
  "/purchase-success": "Purchase Success",
};

const SORTED_PREFIXES = Object.keys(PAGE_LABELS).sort(
  (a, b) => b.length - a.length,
);

function pageLabel(pathname: string): string {
  if (pathname === "/") return "Home";
  const hit = SORTED_PREFIXES.find(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  return hit ? PAGE_LABELS[hit] : pathname;
}

export function ClarityRouteTags() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return;

    const apply = () => {
      try {
        window.clarity?.("set", "page", pageLabel(pathname));
      } catch {
        // ignore
      }
      // Stamp PostHog ids onto the Clarity session for cross-tool pivoting.
      bridgeClarityToPostHog();
    };

    apply();
    // Clarity loads `afterInteractive`; if its stub wasn't ready on first paint,
    // the queued calls above were dropped — retry once after it has loaded.
    const retry = window.clarity ? undefined : window.setTimeout(apply, 1500);
    return () => {
      if (retry) window.clearTimeout(retry);
    };
  }, [pathname]);

  return null;
}

export default ClarityRouteTags;

import { NextResponse, type NextRequest } from "next/server";

// Routes that paid Google Ads traffic should NEVER land on directly.
// They're high-friction (multi-step form, pricing tiers) and have an
// outstanding React #300 (infinite re-render) issue on /builder that
// shows 218 fires in 3 minutes when traffic ramps. /score is the
// designed entry point — free, no signup, 60-second result.
const PAID_TRAFFIC_REDIRECT_FROM = new Set(["/builder", "/pricing", "/optimize"]);

// Query params Google appends to ad-click landing URLs. Presence of any
// one of these = the visitor arrived from a paid Google Ads click.
const PAID_TRAFFIC_PARAMS = ["gclid", "gad_campaignid", "gad_source", "gbraid", "wbraid"];

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (!PAID_TRAFFIC_REDIRECT_FROM.has(pathname)) {
    return NextResponse.next();
  }

  const isPaidTraffic = PAID_TRAFFIC_PARAMS.some((p) => searchParams.has(p));
  if (!isPaidTraffic) {
    return NextResponse.next();
  }

  // Build /score URL preserving every original param. This keeps gclid +
  // gad_* available so GclidCapture can pick them up and so we don't lose
  // attribution. We also tag where the redirect came from so PostHog can
  // distinguish redirected ad clicks from organic /score visits.
  const url = request.nextUrl.clone();
  url.pathname = "/score";
  if (!url.searchParams.has("utm_source")) url.searchParams.set("utm_source", "google");
  if (!url.searchParams.has("utm_medium")) url.searchParams.set("utm_medium", "cpc");
  url.searchParams.set("utm_redirected_from", pathname.replace(/^\//, ""));

  // 307 (temporary) — not 301 — so the original URL stays as the indexed
  // page if SEO ever matters for /builder, and so Search Console + Google
  // Ads don't cache the redirect destination.
  return NextResponse.redirect(url, 307);
}

export const config = {
  // Run ONLY for the three paths above + their trailing-slash variants.
  // Static assets, API routes, and everything else passes through with
  // zero overhead. Static-files exclusion mirrors Next.js's default
  // middleware matcher.
  matcher: [
    "/builder",
    "/pricing",
    "/optimize",
  ],
};

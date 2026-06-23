import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
// We allow /builder and /optimize publicly for "try before signup" experience
const isPublicRoute = createRouteMatcher([
  "/",
  "/score(.*)",
  "/builder(.*)",       // Builder is now public - auth required only on download
  "/optimize(.*)",      // Optimizer is now public - auth required only on analyze
  "/results(.*)",       // Results are public - data is in URL/state
  "/api/score-teaser(.*)",
  // NOTE: /api/analyze is NOT public — it requires auth and charges a credit
  // at the route level (app/api/analyze/route.ts).
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/admin(.*)",         // Admin pages require authentication
]);

// Paid Google Ads traffic should NEVER land directly on these high-friction
// pages (multi-step form, pricing tiers). /score is the designed entry point —
// free, no signup, 60-second result. Folded into proxy.ts (not a separate
// middleware.ts) because Next 16 uses proxy.ts and a stray middleware.ts breaks
// the build + would bypass Clerk's middleware.
const PAID_TRAFFIC_REDIRECT_FROM = new Set(["/builder", "/pricing", "/optimize"]);
const PAID_TRAFFIC_PARAMS = ["gclid", "gad_campaignid", "gad_source", "gbraid", "wbraid"];

export default clerkMiddleware(async (auth, req) => {
  // Redirect paid Google Ads clicks off high-friction pages to /score before
  // any auth work, preserving gclid/gad_* for attribution + tagging the source.
  const { pathname, searchParams } = req.nextUrl;
  if (
    PAID_TRAFFIC_REDIRECT_FROM.has(pathname) &&
    PAID_TRAFFIC_PARAMS.some((p) => searchParams.has(p))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/score";
    if (!url.searchParams.has("utm_source")) url.searchParams.set("utm_source", "google");
    if (!url.searchParams.has("utm_medium")) url.searchParams.set("utm_medium", "cpc");
    url.searchParams.set("utm_redirected_from", pathname.replace(/^\//, ""));
    // 307 (temporary) so the original URL stays indexed and Google doesn't
    // cache the redirect destination.
    return NextResponse.redirect(url, 307);
  }

  // Skip protection for public routes
  if (isPublicRoute(req)) {
    return;
  }
  
  // Protect specific routes - redirect to sign-in if not authenticated
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
  // Note: /optimize and /results are now public for testing
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

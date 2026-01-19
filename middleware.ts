import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that don't require authentication
// We allow /builder and /optimize publicly for "try before signup" experience
const isPublicRoute = createRouteMatcher([
  "/",
  "/score(.*)",
  "/builder(.*)",       // Builder is now public - auth required only on download
  "/optimize(.*)",      // Optimizer is now public - auth required only on analyze
  "/results(.*)",       // Results are public - data is in URL/state
  "/api/score-teaser(.*)",
  "/api/analyze(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/admin(.*)",         // Admin pages require authentication
]);

export default clerkMiddleware(async (auth, req) => {
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

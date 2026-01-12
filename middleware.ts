import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/builder(.*)",
  "/dashboard(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
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

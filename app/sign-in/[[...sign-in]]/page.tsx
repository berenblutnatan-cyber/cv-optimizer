import { SignIn } from "@clerk/nextjs";
import { GradientShell } from "@/components/shell/GradientShell";

// Real, app-hosted sign-in route. Every `redirect("/sign-in?redirect_url=…")`
// across the app (build/chat, build/voice, dashboard, admin, roles, checkout)
// lands here — previously there was NO such route, so all of them 404'd.
//
// Two reasons it's an embedded catch-all rather than Clerk's hosted page:
//   1. Same origin → persisted client state (the "resume-storage" and
//      "hired-onboarding" localStorage stores) survives the auth round-trip,
//      so a seeded role/CV is preserved when the user lands back in /build/chat.
//   2. Clerk reads the `redirect_url` query param off the path natively (and
//      only allows same-origin destinations), so the existing redirects route
//      the user back to where they came from with no extra wiring here.
export const metadata = { title: "Sign in · Hired" };

export default function SignInPage() {
  return (
    <GradientShell>
      <div className="min-h-dvh flex items-center justify-center px-4 py-12">
        <SignIn signUpUrl="/sign-up" />
      </div>
    </GradientShell>
  );
}

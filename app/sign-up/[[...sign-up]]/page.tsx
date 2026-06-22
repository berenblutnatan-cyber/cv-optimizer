import { SignUp } from "@clerk/nextjs";
import { GradientShell } from "@/components/shell/GradientShell";

// Companion to /sign-in — the modal sign-up buttons (StartChoice, AuthModal,
// home/pricing/score) keep using `mode="modal"`, but the "create an account"
// link inside the embedded <SignIn/> needs a real route to navigate to. Clerk
// preserves the `redirect_url` query param across the sign-in ⇄ sign-up swap.
export const metadata = { title: "Create your account · Hired" };

export default function SignUpPage() {
  return (
    <GradientShell>
      <div className="min-h-dvh flex items-center justify-center px-4 py-12">
        <SignUp signInUrl="/sign-in" />
      </div>
    </GradientShell>
  );
}

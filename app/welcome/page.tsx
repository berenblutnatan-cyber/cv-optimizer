import { redirect } from "next/navigation";

// The old two-step welcome flow (/welcome → /start) was superseded by the
// guided funnel embedded on the home page (BuildOnboarding). Nothing in the
// app links here anymore, and the page rendered white text over a pastel
// GradientShell (~1.4:1 contrast). Anyone arriving via an old external link
// gets sent to the live funnel instead.
export default function WelcomePage() {
  redirect("/");
}

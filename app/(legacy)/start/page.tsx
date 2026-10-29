import { redirect } from "next/navigation";

// Step 2 of the retired welcome flow (/welcome → /start), superseded by the
// guided funnel on the home page (BuildOnboarding). Its only inbound link was
// /welcome, which now also redirects home — old external links land on the
// live funnel instead of an unreadable white-on-pastel page.
export default function StartPage() {
  redirect("/");
}

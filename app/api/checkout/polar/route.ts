import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Checkout } from "@polar-sh/nextjs";
import { POLAR_PLANS, POLAR_SERVER, type PolarPlanKey } from "@/lib/polar";

export const dynamic = "force-dynamic";

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export async function GET(req: NextRequest) {
  const plan = req.nextUrl.searchParams.get("plan") as PolarPlanKey | null;

  const { userId } = await auth();
  if (!userId) {
    // Preserve checkout intent across sign-in so users land back here, not on /pricing.
    const signInUrl = new URL("/sign-in", baseUrl);
    if (plan) signInUrl.searchParams.set("redirect_url", `/api/checkout/polar?plan=${plan}`);
    return NextResponse.redirect(signInUrl);
  }

  const planConfig = plan ? POLAR_PLANS[plan] : null;
  if (!planConfig || !planConfig.productId) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;

  const handler = Checkout({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    successUrl: `${baseUrl}/purchase-success?checkout_id={CHECKOUT_ID}&plan=${plan}`,
    server: POLAR_SERVER,
  });

  const url = new URL(req.url);
  url.searchParams.set("products", planConfig.productId);
  url.searchParams.set("customerExternalId", userId);
  if (email) url.searchParams.set("customerEmail", email);

  // Attribution: thread the Google Ads click ID (captured client-side by
  // GclidCapture and stored in a 90-day cookie) into Polar's order metadata
  // so the webhook can persist it on the Purchase row. Without this we can't
  // attribute paid orders back to the ad click that drove them and the
  // Google Ads Purchase conversion stays "Unverified".
  const gclid = req.cookies.get("gclid")?.value;
  if (gclid) {
    url.searchParams.set("metadata[gclid]", gclid);
  }

  const proxied = new NextRequest(url, req);
  return handler(proxied);
}

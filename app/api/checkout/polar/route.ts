import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Checkout } from "@polar-sh/nextjs";
import { POLAR_PLANS, POLAR_SERVER, type PolarPlanKey } from "@/lib/polar";

export const dynamic = "force-dynamic";

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const handler = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  successUrl: `${baseUrl}/pricing?purchase=success&checkout_id={CHECKOUT_ID}`,
  server: POLAR_SERVER,
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", baseUrl));
  }

  const plan = req.nextUrl.searchParams.get("plan") as PolarPlanKey | null;
  const planConfig = plan ? POLAR_PLANS[plan] : null;
  if (!planConfig || !planConfig.productId) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;

  const url = new URL(req.url);
  url.searchParams.set("products", planConfig.productId);
  url.searchParams.set("customerExternalId", userId);
  if (email) url.searchParams.set("customerEmail", email);

  const proxied = new NextRequest(url, req);
  return handler(proxied);
}

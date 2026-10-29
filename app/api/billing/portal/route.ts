import { auth } from "@clerk/nextjs/server";
import { CustomerPortal } from "@polar-sh/nextjs";
import { POLAR_SERVER } from "@/lib/polar";

export const dynamic = "force-dynamic";

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// GET /api/billing/portal — Polar's customer portal (invoices, cancel Unlimited).
export async function GET(req: Request) {
  const { userId } = await auth().catch(() => ({ userId: null }));
  if (!userId) return Response.redirect(new URL("/sign-in?redirect_url=/account", baseUrl));
  if (!process.env.POLAR_ACCESS_TOKEN) return Response.redirect(new URL("/account?portal=unavailable", baseUrl));
  const handler = CustomerPortal({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    server: POLAR_SERVER,
    returnUrl: `${baseUrl}/account`,
    getExternalCustomerId: async () => userId,
  });
  return handler(req as never);
}

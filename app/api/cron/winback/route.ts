import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { POLAR_PLANS } from "@/lib/polar";
import { sendWinbackEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Win-back cron. Targets users who signed up, burned their one free credit, and
// never purchased — and pulls them back with the (still-valid) welcome deal.
// Runs daily (see vercel.json). Secured by CRON_SECRET; Vercel sends it as a
// Bearer token automatically when the env var is set.
//
// Honesty guards:
//  - Each user is emailed at most once (winbackEmailedAt is set after a real send).
//  - We skip placeholder (@pending.local) addresses and active subscribers.
//  - If Resend isn't configured we mark nobody — so a later run still catches them.
//  - ?dry=1 returns the would-send list WITHOUT sending or marking (verification).

const GRACE_MS = 24 * 60 * 60 * 1000; // give them a full day before nudging
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // don't chase signups older than a week
const BATCH = 40; // bounded so the run stays well under maxDuration

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dry = req.nextUrl.searchParams.get("dry") === "1";

  // No welcome product → the CTA link would 400. Don't send dead offers.
  const welcome = POLAR_PLANS.welcome;
  if (!welcome.productId) {
    return NextResponse.json({ ok: false, reason: "welcome_plan_not_configured", sent: 0 });
  }

  const now = Date.now();
  const candidates = await prisma.user.findMany({
    where: {
      createdAt: { lte: new Date(now - GRACE_MS), gte: new Date(now - MAX_AGE_MS) },
      credits: { lte: 0 },
      winbackEmailedAt: null,
      purchases: { none: {} },
      // Exclude anyone currently entitled to Unlimited.
      OR: [{ subscriptionStatus: null }, { subscriptionStatus: { not: "active" } }],
      // Real, reachable addresses only.
      email: { not: { endsWith: "@pending.local" } },
    },
    select: { id: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: BATCH,
  });

  if (dry) {
    return NextResponse.json({
      ok: true,
      dry: true,
      eligible: candidates.length,
      sample: candidates.slice(0, 10).map((u) => ({ email: u.email, createdAt: u.createdAt })),
    });
  }

  const ctaUrl = `${baseUrl}/api/checkout/polar?plan=welcome`;
  let sent = 0;
  let failed = 0;
  let aborted = false;

  for (const user of candidates) {
    const res = await sendWinbackEmail({
      userEmail: user.email,
      ctaUrl,
      offerCredits: welcome.credits,
      offerPrice: welcome.amount,
      anchorPrice: 10,
    });

    if (res.ok) {
      // Mark only on a confirmed send, so failures are retried next run.
      await prisma.user.update({
        where: { id: user.id },
        data: { winbackEmailedAt: new Date() },
      });
      sent++;
    } else if (res.reason === "no_api_key") {
      // Misconfiguration — stop the whole run and mark nobody.
      aborted = true;
      break;
    } else {
      failed++;
    }
  }

  return NextResponse.json({
    ok: !aborted,
    sent,
    failed,
    candidates: candidates.length,
    ...(aborted ? { reason: "resend_not_configured" } : {}),
  });
}

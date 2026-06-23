import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { isStatus } from "@/lib/applications";

export const dynamic = "force-dynamic";

// GET /api/applications — the signed-in user's tracked applications.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const applications = await prisma.jobApplication.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ applications });
}

// POST /api/applications — create one. Free (tracking is the hook).
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const company = String(body?.company ?? "").trim().slice(0, 200);
  const title = String(body?.title ?? "").trim().slice(0, 200);
  if (!company || !title) {
    return NextResponse.json({ error: "Company and title are required." }, { status: 400 });
  }
  const status = isStatus(body?.status) ? body.status : "BOOKMARKED";

  const application = await prisma.jobApplication.create({
    data: {
      userId,
      company,
      title,
      status,
      url: body?.url ? String(body.url).slice(0, 2000) : null,
      jdText: body?.jdText ? String(body.jdText).slice(0, 20000) : null,
      location: body?.location ? String(body.location).slice(0, 200) : null,
      salary: body?.salary ? String(body.salary).slice(0, 100) : null,
      notes: body?.notes ? String(body.notes).slice(0, 4000) : null,
      appliedAt: status === "APPLIED" ? new Date() : null,
    },
  });
  return NextResponse.json({ application });
}

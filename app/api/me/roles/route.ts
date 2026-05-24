import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH /api/me/roles — replaces the user's target-role list. Max 5, each
// trimmed and de-duped (case-insensitive).
export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const raw = (body as { roles?: unknown })?.roles;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "roles must be an array" }, { status: 400 });
  }

  const cleaned: string[] = [];
  for (const r of raw) {
    if (typeof r !== "string") continue;
    const t = r.trim().slice(0, 80);
    if (!t) continue;
    if (cleaned.some((c) => c.toLowerCase() === t.toLowerCase())) continue;
    cleaned.push(t);
    if (cleaned.length >= 5) break;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { targetRoles: cleaned },
  });
  return NextResponse.json({ roles: cleaned });
}

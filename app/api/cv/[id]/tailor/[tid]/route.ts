import { auth } from "@clerk/nextjs/server";
import { getTailoring } from "@/lib/tailor/store";
import { tailorErrorResponse } from "@/lib/tailor/http";

export const dynamic = "force-dynamic";

// GET /api/cv/[id]/tailor/[tid] — one run, with whether it can still be applied.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; tid: string }> }) {
  const { id, tid } = await params;
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Sign in", code: "UNAUTHORIZED" }, { status: 401 });
  try {
    const t = await getTailoring(userId, id, tid);
    return Response.json({ ...t, createdAt: t.createdAt.toISOString() });
  } catch (err) {
    return tailorErrorResponse(err, "tailor:get");
  }
}

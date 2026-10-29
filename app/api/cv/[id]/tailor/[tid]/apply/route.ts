import { auth } from "@clerk/nextjs/server";
import { limit, limitResponse } from "@/lib/limits";
import { readJson } from "@/lib/resume/http";
import { applySuggestions } from "@/lib/tailor/store";
import { tailorErrorResponse } from "@/lib/tailor/http";

export const dynamic = "force-dynamic";

// POST /api/cv/[id]/tailor/[tid]/apply { suggestionIds } — apply grounded changes, save a version.
export async function POST(request: Request, { params }: { params: Promise<{ id: string; tid: string }> }) {
  const { id, tid } = await params;
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Sign in", code: "UNAUTHORIZED" }, { status: 401 });
  const rl = await limit({ name: "tailor-apply", id: userId, cap: 120, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  const body = await readJson(request);
  try {
    return Response.json(await applySuggestions(userId, id, tid, body?.suggestionIds as string[]));
  } catch (err) {
    return tailorErrorResponse(err, "tailor:apply");
  }
}

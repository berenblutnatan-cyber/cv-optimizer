import { limit, limitResponse } from "@/lib/limits";
import { readJson } from "@/lib/resume/http";
import { interviewErrorResponse, interviewUser } from "@/lib/interview/http";
import { applyAddToCv } from "@/lib/interview/store";

export const dynamic = "force-dynamic";

// POST /api/interview/[id]/apply { index } — put that answer's fact on the CV.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await interviewUser();
  if (u instanceof Response) return u;
  const rl = await limit({ name: "interview-apply", id: u.userId, cap: 60, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  const body = await readJson(request);
  const index = Number(body?.index);
  if (!Number.isInteger(index) || index < 0) return Response.json({ error: "Missing index", code: "BAD_REQUEST" }, { status: 400 });
  try {
    return Response.json(await applyAddToCv(u.userId, id, index));
  } catch (err) {
    return interviewErrorResponse(err, "interview:apply");
  }
}

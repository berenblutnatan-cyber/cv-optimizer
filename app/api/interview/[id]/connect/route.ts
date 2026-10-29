import { readJson } from "@/lib/resume/http";
import { interviewErrorResponse, interviewUser } from "@/lib/interview/http";
import { connectInterview } from "@/lib/interview/store";

export const dynamic = "force-dynamic";

// POST /api/interview/[id]/connect { conversationId } — the call is live.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await interviewUser();
  if (u instanceof Response) return u;
  const body = await readJson(request);
  try {
    await connectInterview(u.userId, id, String(body?.conversationId ?? ""));
    return Response.json({ ok: true });
  } catch (err) {
    return interviewErrorResponse(err, "interview:connect");
  }
}

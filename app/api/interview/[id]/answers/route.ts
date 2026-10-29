import { limit, limitResponse } from "@/lib/limits";
import { readJson } from "@/lib/resume/http";
import { anthropic, interviewErrorResponse, interviewUser } from "@/lib/interview/http";
import { publicInterview, submitTypedAnswers } from "@/lib/interview/store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/interview/[id]/answers { answers: [{ index, text }] } — typed
// practice: save the answers and score them now.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await interviewUser();
  if (u instanceof Response) return u;
  const rl = await limit({ name: "interview-answers", id: u.userId, cap: 20, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  const body = await readJson(request);
  try {
    const row = await submitTypedAnswers(anthropic, u.userId, id, body?.answers);
    return Response.json({ interview: publicInterview(row) });
  } catch (err) {
    return interviewErrorResponse(err, "interview:answers");
  }
}

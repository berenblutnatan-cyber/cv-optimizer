import { after } from "next/server";
import { interviewErrorResponse, interviewUser, scoreWhenReady } from "@/lib/interview/http";
import { finishVoice, publicInterview } from "@/lib/interview/store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/interview/[id]/finish — the call is over. Answers immediately;
// scoring runs after the response once ElevenLabs has the final transcript
// (the browser polls GET /api/interview/[id]).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await interviewUser();
  if (u instanceof Response) return u;
  try {
    const row = await finishVoice(u.userId, id);
    if (row.status === "scoring") after(() => scoreWhenReady(id));
    return Response.json({ interview: publicInterview(row) });
  } catch (err) {
    return interviewErrorResponse(err, "interview:finish");
  }
}

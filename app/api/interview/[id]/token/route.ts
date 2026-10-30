import { currentUser } from "@clerk/nextjs/server";
import { limit, limitResponse } from "@/lib/limits";
import { readJson } from "@/lib/resume/http";
import { interviewVariables } from "@/lib/voice/agent";
import { interviewVoiceConfig, mintConversationToken } from "@/lib/voice/elevenlabs";
import { interviewErrorResponse, interviewUser } from "@/lib/interview/http";
import { remainingSeconds, reserveVoiceAttempt } from "@/lib/interview/store";
import type { InterviewQuestion } from "@/lib/interview/types";

export const dynamic = "force-dynamic";

// POST /api/interview/[id]/token { startAt } — a connection for the call: the
// first, or a reconnect that resumes at question startAt + 1. Same clock,
// no new charge (at most INTERVIEW.maxAttempts connections).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await interviewUser();
  if (u instanceof Response) return u;
  const cfg = interviewVoiceConfig();
  if (!cfg) return Response.json({ error: "Voice isn't set up yet.", code: "UNAVAILABLE" }, { status: 503 });
  const rl = await limit({ name: "interview-token", id: u.userId, cap: 30, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  const body = await readJson(request);
  try {
    const { row, attempt } = await reserveVoiceAttempt(u.userId, id);
    const questions = row.questions as unknown as InterviewQuestion[];
    const n = Math.floor(Number(body?.startAt));
    const startAt = Number.isFinite(n) ? Math.min(Math.max(0, n), questions.length - 1) : 0;
    const [token, user] = await Promise.all([mintConversationToken(cfg.apiKey, cfg.agentId), currentUser().catch(() => null)]);
    return Response.json({
      attempt,
      token,
      seconds: remainingSeconds(row),
      variables: interviewVariables({ sessionId: row.id, attempt, jobTitle: row.jobTitle, company: row.company, questions, startAt, userName: user?.firstName ?? null }),
    });
  } catch (err) {
    return interviewErrorResponse(err, "interview:token");
  }
}

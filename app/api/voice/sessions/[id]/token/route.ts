import { limit, limitResponse } from "@/lib/limits";
import { loadResume } from "@/lib/resume/store";
import { intakeVariables } from "@/lib/voice/agent";
import { mintConversationToken, voiceConfig } from "@/lib/voice/elevenlabs";
import { voiceErrorResponse, voiceUser } from "@/lib/voice/http";
import { remainingSeconds, reserveAttempt, VoiceError } from "@/lib/voice/sessions";
import { currentUser } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

// POST /api/voice/sessions/[id]/token — reconnect after a dropped call.
// Same session, same clock, no new charge (at most VOICE.maxAttempts connections).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await voiceUser();
  if (u instanceof Response) return u;
  const cfg = voiceConfig();
  if (!cfg) return Response.json({ error: "Voice isn't set up yet.", code: "UNAVAILABLE" }, { status: 503 });
  const rl = await limit({ name: "voice-token", id: u.userId, cap: 30, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  try {
    const { session, attempt } = await reserveAttempt(u.userId, id);
    if (!session.resumeId) throw new VoiceError("EXPIRED", "This CV was deleted");
    const [token, resume, user] = await Promise.all([
      mintConversationToken(cfg.apiKey, cfg.agentId),
      loadResume(session.resumeId, { userId: u.userId, anonKeyHash: null }),
      currentUser().catch(() => null),
    ]);
    if (!resume) throw new VoiceError("EXPIRED", "This CV was deleted");
    const seconds = remainingSeconds(session);
    return Response.json({
      sessionId: session.id,
      attempt,
      token,
      seconds,
      variables: intakeVariables({ content: resume.doc.content, userName: user?.firstName ?? null, sessionId: session.id, attempt, seconds }),
    });
  } catch (err) {
    return voiceErrorResponse(err, "voice:token");
  }
}

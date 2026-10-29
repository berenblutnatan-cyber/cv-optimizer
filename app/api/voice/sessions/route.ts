import { limit, limitResponse } from "@/lib/limits";
import { readJson } from "@/lib/resume/http";
import { ensureUser } from "@/lib/users";
import { intakeVariables } from "@/lib/voice/agent";
import { mintConversationToken, voiceConfig } from "@/lib/voice/elevenlabs";
import { voiceErrorResponse, voiceUser } from "@/lib/voice/http";
import { loadResume } from "@/lib/resume/store";
import { failSession, remainingSeconds, reserveAttempt, startVoiceSession, voiceOffer } from "@/lib/voice/sessions";
import { currentUser } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

// GET /api/voice/sessions — what talking costs this user right now.
export async function GET() {
  const u = await voiceUser();
  if (u instanceof Response) return u;
  await ensureUser(u.userId);
  return Response.json({ ...(await voiceOffer(u.userId)), available: !!voiceConfig() });
}

// POST /api/voice/sessions { cvId } — start talking about this CV.
// Charges (or uses the free session) and mints the first connection token.
// Called only from the Start click, never on page load.
export async function POST(request: Request) {
  const u = await voiceUser();
  if (u instanceof Response) return u;
  const cfg = voiceConfig();
  if (!cfg) return Response.json({ error: "Voice isn't set up yet.", code: "UNAVAILABLE" }, { status: 503 });
  const rl = await limit({ name: "voice-start", id: u.userId, cap: 8, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  const body = await readJson(request);
  const cvId = typeof body?.cvId === "string" ? body.cvId : null;
  if (!cvId) return Response.json({ error: "Missing cvId", code: "BAD_REQUEST" }, { status: 400 });

  await ensureUser(u.userId);
  let sessionId: string | null = null;
  try {
    const session = await startVoiceSession(u.userId, cvId);
    sessionId = session.id;
    const { attempt } = await reserveAttempt(u.userId, session.id);
    const token = await mintConversationToken(cfg.apiKey, cfg.agentId);
    const [resume, user] = await Promise.all([loadResume(cvId, { userId: u.userId, anonKeyHash: null }), currentUser().catch(() => null)]);
    return Response.json({
      sessionId: session.id,
      attempt,
      token,
      seconds: remainingSeconds(session),
      free: session.free,
      charged: session.creditsCharged,
      variables: intakeVariables({ content: resume!.doc.content, userName: user?.firstName ?? null, sessionId: session.id, attempt, seconds: session.maxSeconds }),
    });
  } catch (err) {
    // Started but couldn't connect: give back what it cost.
    if (sessionId) await failSession(sessionId, (err as Error).message ?? "start failed").catch((e) => console.error("[voice:start] refund failed", e));
    return voiceErrorResponse(err, "voice:start");
  }
}

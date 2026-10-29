import { limit, limitResponse } from "@/lib/limits";
import { readJson } from "@/lib/resume/http";
import { ensureUser } from "@/lib/users";
import { interviewVoiceConfig } from "@/lib/voice/elevenlabs";
import { anthropic, interviewErrorResponse, interviewUser } from "@/lib/interview/http";
import { createInterview, listInterviews, publicInterview } from "@/lib/interview/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/interview — this user's practice sessions, newest first.
export async function GET() {
  const u = await interviewUser();
  if (u instanceof Response) return u;
  return Response.json({ interviews: await listInterviews(u.userId), voice: !!interviewVoiceConfig() });
}

// POST /api/interview { cvId, tailoringId? | jd, jobTitle?, company?, mode } —
// write the questions, then charge one credit. Nothing is charged if the
// questions can't be written.
export async function POST(request: Request) {
  const u = await interviewUser();
  if (u instanceof Response) return u;
  const rl = await limit({ name: "interview-create", id: u.userId, cap: 10, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  const body = await readJson(request);
  const cvId = typeof body?.cvId === "string" ? body.cvId : null;
  const mode = body?.mode === "voice" ? "voice" : body?.mode === "text" ? "text" : null;
  if (!cvId || !mode) return Response.json({ error: "Missing cvId or mode", code: "BAD_REQUEST" }, { status: 400 });
  if (mode === "voice" && !interviewVoiceConfig()) return Response.json({ error: "Voice isn't set up yet.", code: "UNAVAILABLE" }, { status: 503 });
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);

  await ensureUser(u.userId);
  try {
    const row = await createInterview(anthropic, u.userId, {
      resumeId: cvId,
      tailoringId: str(body?.tailoringId) ?? null,
      jd: str(body?.jd),
      jobTitle: str(body?.jobTitle),
      company: str(body?.company),
      mode,
    });
    return Response.json({ interview: publicInterview(row) });
  } catch (err) {
    return interviewErrorResponse(err, "interview:create");
  }
}

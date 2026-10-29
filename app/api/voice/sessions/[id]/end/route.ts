import { voiceErrorResponse, voiceUser } from "@/lib/voice/http";
import { endVoiceSession } from "@/lib/voice/sessions";

export const dynamic = "force-dynamic";

// POST /api/voice/sessions/[id]/end — the user ended the call (or time ran out).
// The browser saves its edits first, so the version this makes includes them.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await voiceUser();
  if (u instanceof Response) return u;
  try {
    return Response.json(await endVoiceSession(u.userId, id));
  } catch (err) {
    return voiceErrorResponse(err, "voice:end");
  }
}

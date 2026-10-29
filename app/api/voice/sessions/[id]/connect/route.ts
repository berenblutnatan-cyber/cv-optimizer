import { readJson } from "@/lib/resume/http";
import { voiceErrorResponse, voiceUser } from "@/lib/voice/http";
import { connectConversation } from "@/lib/voice/sessions";

export const dynamic = "force-dynamic";

// POST /api/voice/sessions/[id]/connect { attempt, conversationId } — the call is live.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await voiceUser();
  if (u instanceof Response) return u;
  const body = await readJson(request);
  try {
    await connectConversation(u.userId, id, Number(body?.attempt), String(body?.conversationId ?? ""));
    return Response.json({ ok: true });
  } catch (err) {
    return voiceErrorResponse(err, "voice:connect");
  }
}

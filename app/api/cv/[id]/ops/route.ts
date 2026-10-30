import { clientIp, limit, limitResponse } from "@/lib/limits";
import { currentOwner, ownerKey } from "@/lib/resume/owner";
import { appendOps, parseOps } from "@/lib/resume/store";
import { readJson, storeErrorResponse } from "@/lib/resume/http";
import { authorizeVoiceOps, VoiceError } from "@/lib/voice/sessions";

export const dynamic = "force-dynamic";

// POST /api/cv/[id]/ops — append the editor's edits. Typed edits are actor
// "user"; edits a voice agent made during a call carry their voiceSessionId
// (actor "intake_agent") and must belong to a live session of this user on
// this CV. Body: { ops: [{ clientOpId, name, input, voiceSessionId? }] }.
// Returns the authoritative doc.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await currentOwner();
  if (!owner) return Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });
  const rl = await limit({ name: "cv-ops", id: ownerKey(owner, clientIp(request)), cap: 1500, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  const body = await readJson(request);
  if (!body) return Response.json({ error: "Invalid JSON", code: "BAD_REQUEST" }, { status: 400 });
  try {
    const ops = parseOps(body.ops);
    await authorizeVoiceOps(owner, id, ops);
    return Response.json(await appendOps(id, owner, ops, "user"));
  } catch (err) {
    if (err instanceof VoiceError) return Response.json({ error: err.message, code: err.code }, { status: 400 });
    return storeErrorResponse(err, "cv:ops");
  }
}

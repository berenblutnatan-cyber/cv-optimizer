import { clientIp, limit, limitResponse } from "@/lib/limits";
import { currentOwner, ownerKey } from "@/lib/resume/owner";
import { appendOps } from "@/lib/resume/store";
import { readJson, storeErrorResponse } from "@/lib/resume/http";

export const dynamic = "force-dynamic";

// POST /api/cv/[id]/ops — append the editor's typed edits (actor "user").
// Body: { ops: [{ clientOpId, name, input }] }. Returns the authoritative doc.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await currentOwner();
  if (!owner) return Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });
  const rl = await limit({ name: "cv-ops", id: ownerKey(owner, clientIp(request)), cap: 1500, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  const body = await readJson(request);
  if (!body) return Response.json({ error: "Invalid JSON", code: "BAD_REQUEST" }, { status: 400 });
  try {
    return Response.json(await appendOps(id, owner, body.ops, "user"));
  } catch (err) {
    return storeErrorResponse(err, "cv:ops");
  }
}

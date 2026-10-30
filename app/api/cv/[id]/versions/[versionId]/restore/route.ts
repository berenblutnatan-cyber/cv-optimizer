import { clientIp, limit, limitResponse } from "@/lib/limits";
import { currentOwner, ownerKey } from "@/lib/resume/owner";
import { restoreVersion } from "@/lib/resume/store";
import { readJson, storeErrorResponse } from "@/lib/resume/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params;
  const owner = await currentOwner();
  if (!owner) return Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });
  const rl = await limit({ name: "cv-version-write", id: ownerKey(owner, clientIp(request)), cap: 120, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  try {
    // Body { undoOf } (optional): this restore undoes the restore of that version.
    const body = await readJson(request);
    const undoOf = typeof body?.undoOf === "string" ? body.undoOf : undefined;
    return Response.json(await restoreVersion(id, owner, versionId, { undoOf }));
  } catch (err) {
    return storeErrorResponse(err, "cv:versions:restore");
  }
}

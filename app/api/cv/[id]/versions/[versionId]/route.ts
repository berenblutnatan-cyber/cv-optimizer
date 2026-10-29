import { clientIp, limit, limitResponse } from "@/lib/limits";
import { currentOwner, ownerKey } from "@/lib/resume/owner";
import { getVersion, renameVersion } from "@/lib/resume/store";
import { readJson, storeErrorResponse } from "@/lib/resume/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; versionId: string }> };
const notFound = () => Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });

// GET — one version with its document, for a read-only preview before restoring.
export async function GET(_req: Request, { params }: Ctx) {
  const { id, versionId } = await params;
  const owner = await currentOwner();
  if (!owner) return notFound();
  try {
    return Response.json(await getVersion(id, owner, versionId));
  } catch (err) {
    return storeErrorResponse(err, "cv:versions:get");
  }
}

// PATCH { label } — rename. An empty label clears it.
export async function PATCH(request: Request, { params }: Ctx) {
  const { id, versionId } = await params;
  const owner = await currentOwner();
  if (!owner) return notFound();
  const rl = await limit({ name: "cv-version-write", id: ownerKey(owner, clientIp(request)), cap: 120, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  const body = await readJson(request);
  if (typeof body?.label !== "string") return Response.json({ error: "Label is required", code: "BAD_REQUEST" }, { status: 400 });
  try {
    return Response.json(await renameVersion(id, owner, versionId, body.label));
  } catch (err) {
    return storeErrorResponse(err, "cv:versions:rename");
  }
}

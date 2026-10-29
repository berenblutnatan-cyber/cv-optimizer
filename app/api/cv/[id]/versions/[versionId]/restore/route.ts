import { currentOwner } from "@/lib/resume/owner";
import { restoreVersion } from "@/lib/resume/store";
import { storeErrorResponse } from "@/lib/resume/http";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params;
  const owner = await currentOwner();
  if (!owner) return Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });
  try {
    return Response.json(await restoreVersion(id, owner, versionId));
  } catch (err) {
    return storeErrorResponse(err, "cv:versions:restore");
  }
}

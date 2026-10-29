import { currentOwner } from "@/lib/resume/owner";
import { deleteResume, loadResume } from "@/lib/resume/store";
import { storeErrorResponse } from "@/lib/resume/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const owner = await currentOwner();
  if (!owner) return Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });
  try {
    const cv = await loadResume(id, owner);
    if (!cv) return Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });
    return Response.json(cv);
  } catch (err) {
    return storeErrorResponse(err, "cv:get");
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const owner = await currentOwner();
  if (!owner) return Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });
  try {
    await deleteResume(id, owner);
    return new Response(null, { status: 204 });
  } catch (err) {
    return storeErrorResponse(err, "cv:delete");
  }
}

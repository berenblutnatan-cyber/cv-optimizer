import { currentOwner } from "@/lib/resume/owner";
import { createVersion, listVersions } from "@/lib/resume/store";
import { readJson, storeErrorResponse } from "@/lib/resume/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const owner = await currentOwner();
  if (!owner) return Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });
  try {
    return Response.json({ versions: await listVersions(id, owner) });
  } catch (err) {
    return storeErrorResponse(err, "cv:versions:list");
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const owner = await currentOwner();
  if (!owner) return Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });
  const body = (await readJson(request)) ?? {};
  try {
    const version = await createVersion(id, owner, {
      label: typeof body.label === "string" ? body.label : undefined,
      createdBy: "user",
    });
    return Response.json(version, { status: 201 });
  } catch (err) {
    return storeErrorResponse(err, "cv:versions:create");
  }
}

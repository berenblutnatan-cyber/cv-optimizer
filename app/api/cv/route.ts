import { clientIp, limit, limitResponse } from "@/lib/limits";
import { currentOwner, ensureOwner, ownerKey } from "@/lib/resume/owner";
import { createResume, listResumes } from "@/lib/resume/store";
import { storeErrorResponse } from "@/lib/resume/http";
import { ensureUser } from "@/lib/users";

export const dynamic = "force-dynamic";

// GET /api/cv — the caller's CVs (account or signed-out draft), newest first.
export async function GET() {
  const owner = await currentOwner();
  if (!owner) return Response.json({ resumes: [] });
  try {
    return Response.json({ resumes: await listResumes(owner) });
  } catch (err) {
    return storeErrorResponse(err, "cv:list");
  }
}

// POST /api/cv — create a blank CV. Signed-out visitors get a draft cookie.
export async function POST(request: Request) {
  const owner = await ensureOwner();
  const rl = await limit({ name: "cv-create", id: ownerKey(owner, clientIp(request)), cap: 20, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  try {
    if (owner.userId) await ensureUser(owner.userId);
    const { id, doc, lastSeq } = await createResume(owner);
    return Response.json({ id, doc, lastSeq }, { status: 201 });
  } catch (err) {
    return storeErrorResponse(err, "cv:create");
  }
}

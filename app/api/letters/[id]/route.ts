import { limit, limitResponse } from "@/lib/limits";
import { readJson } from "@/lib/resume/http";
import { saveLetterBody } from "@/lib/cover/store";
import { jobsErrorResponse, jobsUser } from "@/lib/jobs/http";

export const dynamic = "force-dynamic";

// PATCH /api/letters/[id] { body } — save an edited letter (free).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await jobsUser();
  if (u instanceof Response) return u;
  const rl = await limit({ name: "letter-save", id: u.userId, cap: 600, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  const body = await readJson(request);
  try {
    return Response.json({ letter: await saveLetterBody(u.userId, id, body?.body) });
  } catch (err) {
    return jobsErrorResponse(err, "letter:save");
  }
}

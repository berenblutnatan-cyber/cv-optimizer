import { limit, limitResponse } from "@/lib/limits";
import { createCoverLetter } from "@/lib/cover/store";
import { anthropic, jobsErrorResponse, jobsUser } from "@/lib/jobs/http";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST /api/jobs/[id]/letter — write a cover letter for this job (1 credit,
// charged only once the letter exists).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await jobsUser();
  if (u instanceof Response) return u;
  const rl = await limit({ name: "letter-create", id: u.userId, cap: 10, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  try {
    return Response.json({ letter: await createCoverLetter(anthropic, u.userId, id) });
  } catch (err) {
    return jobsErrorResponse(err, "letter:create");
  }
}

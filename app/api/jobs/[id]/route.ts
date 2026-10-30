import { limit, limitResponse } from "@/lib/limits";
import { readJson } from "@/lib/resume/http";
import { jobsErrorResponse, jobsUser } from "@/lib/jobs/http";
import { deleteJob, getJob, updateJob } from "@/lib/jobs/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/jobs/[id] — the job with its tailorings, interviews and letter.
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const u = await jobsUser();
  if (u instanceof Response) return u;
  try {
    return Response.json({ job: await getJob(u.userId, id) });
  } catch (err) {
    return jobsErrorResponse(err, "jobs:get");
  }
}

// PATCH /api/jobs/[id] — change fields or move the stage.
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const u = await jobsUser();
  if (u instanceof Response) return u;
  const rl = await limit({ name: "jobs-update", id: u.userId, cap: 600, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  const body = await readJson(request);
  if (!body) return Response.json({ error: "Bad request", code: "BAD_REQUEST" }, { status: 400 });
  try {
    return Response.json({ job: await updateJob(u.userId, id, body) });
  } catch (err) {
    return jobsErrorResponse(err, "jobs:update");
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const u = await jobsUser();
  if (u instanceof Response) return u;
  try {
    await deleteJob(u.userId, id);
    return Response.json({ ok: true });
  } catch (err) {
    return jobsErrorResponse(err, "jobs:delete");
  }
}

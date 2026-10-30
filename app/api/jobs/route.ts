import { limit, limitResponse } from "@/lib/limits";
import { readJson } from "@/lib/resume/http";
import { ensureUser } from "@/lib/users";
import { jobsErrorResponse, jobsUser } from "@/lib/jobs/http";
import { createJob, listJobs } from "@/lib/jobs/store";

export const dynamic = "force-dynamic";

// GET /api/jobs — every tracked job, most recently touched first.
export async function GET() {
  const u = await jobsUser();
  if (u instanceof Response) return u;
  return Response.json({ jobs: await listJobs(u.userId) });
}

// POST /api/jobs { company, title, url?, jdText?, location?, stage?, resumeId? } | { fromTailoringId }
export async function POST(request: Request) {
  const u = await jobsUser();
  if (u instanceof Response) return u;
  const rl = await limit({ name: "jobs-create", id: u.userId, cap: 120, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  const body = await readJson(request);
  if (!body) return Response.json({ error: "Bad request", code: "BAD_REQUEST" }, { status: 400 });
  await ensureUser(u.userId);
  try {
    return Response.json({ job: await createJob(u.userId, body) });
  } catch (err) {
    return jobsErrorResponse(err, "jobs:create");
  }
}

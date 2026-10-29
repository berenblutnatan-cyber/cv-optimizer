import { interviewErrorResponse, interviewUser } from "@/lib/interview/http";
import { getInterview, publicInterview, remainingSeconds } from "@/lib/interview/store";

export const dynamic = "force-dynamic";

// GET /api/interview/[id] — the session (polled while it is being scored).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await interviewUser();
  if (u instanceof Response) return u;
  try {
    const row = await getInterview(u.userId, id);
    return Response.json({ interview: publicInterview(row), seconds: remainingSeconds(row) });
  } catch (err) {
    return interviewErrorResponse(err, "interview:get");
  }
}

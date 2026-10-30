import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { canAfford, InsufficientCredits } from "@/lib/billing/ledger";
import { fetchJobDescription } from "@/lib/jobFetcher";
import { limit, limitResponse } from "@/lib/limits";
import { runOptimizerPipeline, PipelineError } from "@/lib/optimizer/pipeline";
import { completeness } from "@/lib/resume/document";
import { readJson } from "@/lib/resume/http";
import { loadResume } from "@/lib/resume/store";
import { contentHash, getTailoring, listTailorings, saveTailoring } from "@/lib/tailor/store";
import type { TailorEvent } from "@/lib/tailor/view";
import { requirementRows, coverageCounts } from "@/lib/tailor/view";
import { ensureUser } from "@/lib/users";
import { resumeToText } from "@/types/resume";

export const dynamic = "force-dynamic";
// Audit + rewrite are two long model calls (60-90 s). The stream flushes at
// once, so only the function's own limit matters.
export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MIN_JD = 80;
const MAX_JD = 30_000;

// GET /api/cv/[id]/tailor — this CV's past runs, newest first.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Sign in to tailor", code: "UNAUTHORIZED" }, { status: 401 });
  return Response.json({ tailorings: await listTailorings(userId, id) });
}

// POST /api/cv/[id]/tailor { jobDescription | jobUrl, jobTitle?, company? }
// Streams SSE: stage → audit (early score + coverage) → done | error.
// One credit, charged in the same transaction that saves the result: a run
// that fails or is refused is never charged.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Sign in to tailor", code: "UNAUTHORIZED" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "Tailoring isn't available right now.", code: "UNAVAILABLE" }, { status: 503 });

  const rl = await limit({ name: "tailor", id: userId, cap: 12, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);

  const body = await readJson(request);
  const jobTitle = typeof body?.jobTitle === "string" ? body.jobTitle.trim().slice(0, 200) : "";
  const company = typeof body?.company === "string" ? body.company.trim().slice(0, 200) : "";
  let jd = typeof body?.jobDescription === "string" ? body.jobDescription.trim() : "";
  const jobUrl = typeof body?.jobUrl === "string" ? body.jobUrl.trim() : "";

  await ensureUser(userId);
  const resume = await loadResume(id, { userId, anonKeyHash: null });
  if (!resume) return Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });
  const content = resume.doc.content;
  if (!completeness(content).some((i) => i.key === "experience" && i.done)) {
    return Response.json({ error: "Add your experience first, then tailor.", code: "EMPTY_CV" }, { status: 400 });
  }

  if (!(await canAfford(userId))) return Response.json({ error: "Out of credits", code: "NO_CREDITS" }, { status: 402 });

  if (!jd && jobUrl) {
    const fetched = await fetchJobDescription(jobUrl, anthropic);
    if (!fetched.ok) return Response.json({ error: fetched.error, code: "JD_FETCH" }, { status: 400 });
    jd = fetched.description.trim();
  }
  if (jd.length < MIN_JD) return Response.json({ error: "Paste the full job description.", code: "BAD_REQUEST" }, { status: 400 });
  if (jd.length > MAX_JD) jd = jd.slice(0, MAX_JD);

  const baseHash = contentHash(content);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (evt: TailorEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
        } catch {
          // Client went away: the run finishes and is saved to history.
          open = false;
        }
      };
      send({ type: "stage", stage: "reading" });
      try {
        const analysis = await runOptimizerPipeline(
          anthropic,
          { cvText: resumeToText(content), resumeData: content, jobTitle, jobDescription: jd, companyName: company, mode: "specific_role" },
          {
            onStage: (stage) => {
              if (stage !== "parsing") send({ type: "stage", stage });
            },
            onAudit: (audit) => send({ type: "audit", score: audit.originalScore.total, coverage: coverageCounts(requirementRows(audit)) }),
          },
        );
        const saved = await saveTailoring({ userId, resumeId: id, jobTitle, company, jdText: jd, analysis, baseHash });
        const detail = await getTailoring(userId, id, saved.id);
        send({ type: "done", id: saved.id, charged: saved.charged, tailoring: { ...detail, createdAt: detail.createdAt.toISOString() } });
      } catch (err) {
        if (err instanceof InsufficientCredits) send({ type: "error", error: "Out of credits", code: "NO_CREDITS" });
        else {
          console.error("[tailor]", err instanceof PipelineError ? `${err.stage}/${err.reason}: ${err.message}` : err);
          send({ type: "error", error: "The check didn't finish. You weren't charged. Try again.", code: "FAILED" });
        }
      } finally {
        if (open) controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no" } });
}

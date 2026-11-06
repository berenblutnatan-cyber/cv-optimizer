import Anthropic from "@anthropic-ai/sdk";
import { clientIp, limit, limitResponse, limitSignedOut } from "@/lib/limits";
import { runAuditPass, PipelineError } from "@/lib/optimizer/pipeline";
import { currentOwner, ownerKey } from "@/lib/resume/owner";
import { loadResume } from "@/lib/resume/store";
import { hasBody } from "@/lib/resume/substance";
import { findReview, latestReview, readHash, saveReview } from "@/lib/review/store";
import { toReadout, type ReviewEvent } from "@/lib/review/view";
import { resumeToText } from "@/types/resume";
import { getServerLang } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
// One long model call (the optimizer's audit pass, 30-90 s).
export const maxDuration = 180;

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });

// GET /api/cv/[id]/review — the read for this CV as it is now, or the last
// one (`current: false` when the CV or its target changed since).
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const owner = await currentOwner();
  if (!owner) return notFound();
  const cv = await loadResume(id, owner);
  if (!cv) return notFound();
  // One read per language: the prose is written in the reader's language.
  const lang = await getServerLang();
  const hash = readHash(cv.doc.content, cv.doc.target, lang);
  const exact = await findReview(id, hash);
  const review = exact ?? (await latestReview(id));
  return Response.json({ readout: review?.readout ?? null, current: !!exact, target: cv.doc.target ?? null });
}

// POST /api/cv/[id]/review — read the CV against its target (doc.target).
// Free, before any edit: no sign-in wall. Streams SSE: stage → done | error.
// A CV read before with the same content and target answers from storage.
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "The review isn't available right now.", code: "UNAVAILABLE" }, { status: 503 });
  const owner = await currentOwner();
  if (!owner) return notFound();
  const cv = await loadResume(id, owner);
  if (!cv) return notFound();
  const { content, target } = cv.doc;
  if (!hasBody(content)) return Response.json({ error: "There's nothing in this CV to read yet.", code: "EMPTY_CV" }, { status: 400 });

  const lang = await getServerLang();
  const hash = readHash(content, target, lang);
  const cached = await findReview(id, hash);
  const sse = (events: (send: (e: ReviewEvent) => void) => Promise<void>) => {
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let open = true;
        const send = (e: ReviewEvent) => {
          if (!open) return;
          try {
            controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
          } catch {
            open = false;
          }
        };
        // Proxies drop a silent stream: a comment line every 15 s keeps it open.
        const beat = setInterval(() => {
          if (!open) return;
          try {
            controller.enqueue(enc.encode(": keep-alive\n\n"));
          } catch {
            open = false;
          }
        }, 15_000);
        try {
          await events(send);
        } finally {
          clearInterval(beat);
          if (open) controller.close();
        }
      },
    });
    return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no" } });
  };
  if (cached) return sse(async (send) => send({ type: "done", readout: cached.readout, cached: true }));

  const who = ownerKey(owner, clientIp(request));
  const rl = await limit({ name: "cv-review", id: who, cap: owner.userId ? 12 : 6, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  const anon = await limitSignedOut(request, !!owner.userId, { name: "cv-review", perIpHour: 8, globalDay: 400 });
  if (anon) return anon;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return sse(async (send) => {
    send({ type: "stage", stage: "reading" });
    try {
      const audit = await runAuditPass(anthropic, {
        cvText: resumeToText(content),
        resumeData: content,
        jobTitle: target?.title || undefined,
        jobDescription: target?.description || undefined,
        mode: target?.title || target?.description ? "specific_role" : "quick",
        ...(lang === "he" ? { replyLanguage: "he" as const } : {}),
      });
      const readout = toReadout(audit, content, target);
      await saveReview(id, hash, target?.title ?? "", readout);
      send({ type: "done", readout, cached: false });
    } catch (err) {
      console.error("[cv:review]", err instanceof PipelineError ? `${err.stage}/${err.reason}: ${err.message}` : err);
      send({ type: "error", error: "The review didn't finish. Try again.", code: "FAILED" });
    }
  });
}

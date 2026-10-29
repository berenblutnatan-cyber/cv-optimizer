import Anthropic from "@anthropic-ai/sdk";
import { CV_TOOLS } from "@/lib/chat/cvTools";
import { buildChatSystemPrompt, type FitContext } from "@/lib/chat/prompts";
import { normalizeTurnHistory, runChatTurn, type TurnEvent } from "@/lib/chat/runTurn";
import { clientIp, limit, limitResponse } from "@/lib/limits";
import { applyDocumentOp, pinTarget, type ResumeDocument } from "@/lib/resume/document";
import { currentOwner, ownerKey } from "@/lib/resume/owner";
import { appendOps, loadResume, type OpInput } from "@/lib/resume/store";
import { readJson } from "@/lib/resume/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type CvChatEvent =
  | TurnEvent
  | { type: "doc"; doc: ResumeDocument; lastSeq: number }
  | { type: "done" }
  | { type: "error"; error: string };

const enc = new TextEncoder();
const frame = (e: CvChatEvent) => enc.encode(`data: ${JSON.stringify(e)}\n\n`);

function readFit(raw: unknown): FitContext | null {
  const f = raw as Record<string, unknown> | null;
  if (!f || typeof f.ratio !== "number" || !Number.isFinite(f.ratio)) return null;
  return { ratio: f.ratio, autoFit: f.autoFit === true, atMinimum: f.atMinimum === true, pageMode: f.pageMode === "multi" ? "multi" : "one" };
}

// POST /api/cv/[id]/chat — one chat turn against the stored CV.
// Body: { messages: [{role, content}], fit? }. The server reads the CV from the
// database (never trusts a client copy), runs the shared agent loop, logs every
// change as an op (actor "chat") after each model round, and streams:
//   text · tool_start · tool · tool_noop · doc (authoritative, at the end) · done | error
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "Chat is not configured", code: "UNAVAILABLE" }, { status: 503 });

  const owner = await currentOwner();
  if (!owner) return Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });
  const rl = await limit({
    name: "cv-chat",
    id: ownerKey(owner, clientIp(request)),
    cap: owner.userId ? 80 : 30,
    windowSec: 3600,
  });
  if (!rl.ok) return limitResponse(rl);

  const body = await readJson(request);
  const messages = normalizeTurnHistory(body?.messages, { maxMessages: 60, maxChars: 24_000 });
  if (!messages) return Response.json({ error: "Last message must be from the user", code: "BAD_REQUEST" }, { status: 400 });

  const cv = await loadResume(id, owner);
  if (!cv) return Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });

  const system = buildChatSystemPrompt(cv.doc.content, readFit(body?.fit), { exportLabel: "Export" });
  const turnId = crypto.randomUUID().slice(0, 12);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: CvChatEvent) => controller.enqueue(frame(e));
      // The document as the model sees it: its starting snapshot plus its own
      // changes. Targets are pinned against this view before logging.
      let modelView = cv.doc;
      let pending: OpInput[] = [];
      let n = 0;
      let latest: { doc: ResumeDocument; lastSeq: number } | null = null;

      const flush = async () => {
        if (pending.length === 0) return;
        const batch = pending;
        pending = [];
        latest = await appendOps(id, owner, batch, "chat");
      };

      try {
        await runChatTurn({
          client: anthropic,
          system,
          tools: CV_TOOLS as Anthropic.Tool[],
          messages,
          emit: send,
          onTool: (name, input) => {
            const pinned = pinTarget(modelView, name, input);
            const next = applyDocumentOp(modelView, name, pinned);
            if (next === modelView) return false;
            modelView = next;
            pending.push({ clientOpId: `chat:${turnId}:${n++}`, name, input: pinned });
            return { input: pinned };
          },
          onRoundEnd: flush,
        });
        await flush();
        if (latest) send({ type: "doc", ...(latest as { doc: ResumeDocument; lastSeq: number }) });
        send({ type: "done" });
      } catch (err) {
        console.error("[cv:chat] turn failed:", err);
        // Whatever completed before the failure is already saved by flush().
        try {
          await flush();
        } catch (flushErr) {
          console.error("[cv:chat] final flush failed:", flushErr);
        }
        if (latest) send({ type: "doc", ...(latest as { doc: ResumeDocument; lastSeq: number }) });
        send({ type: "error", error: "The assistant hit a snag mid-reply. Everything shown is saved — say that again and I'll pick it up." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}

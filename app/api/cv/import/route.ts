import Anthropic from "@anthropic-ai/sdk";
import { extractCvFileText } from "@/lib/cvFileText";
import { parseCvTextStreaming } from "@/lib/optimizer/parseCv";
import { clientIp, limit, limitResponse, limitSignedOut } from "@/lib/limits";
import { emptyDocument, normalizeContent } from "@/lib/resume/document";
import { ensureOwner, ownerKey } from "@/lib/resume/owner";
import { createResume, createVersion } from "@/lib/resume/store";
import { ensureUser } from "@/lib/users";
import { MAX_IMPORT_BYTES, type ImportEvent } from "@/lib/resume/import-types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MIN_TEXT = 50;
const MAX_TEXT = 30_000;

const enc = new TextEncoder();
const frame = (e: ImportEvent) => enc.encode(`data: ${JSON.stringify(e)}\n\n`);
const fail = (status: number, code: string, error: string) => Response.json({ error, code }, { status });

/** The CV text and a label for the "Imported" version, or an error response. */
async function readSource(request: Request): Promise<{ text: string; label: string } | Response> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_IMPORT_BYTES + 64 * 1024) return fail(413, "TOO_LARGE", "That file is over 5 MB.");

  const type = request.headers.get("content-type") || "";
  if (type.includes("multipart/form-data")) {
    let file: FormDataEntryValue | null = null;
    try {
      file = (await request.formData()).get("file");
    } catch {
      return fail(400, "BAD_REQUEST", "Couldn't read the upload. Try again.");
    }
    if (!(file instanceof File) || file.size === 0) return fail(400, "BAD_REQUEST", "Choose a file to upload.");
    if (file.size > MAX_IMPORT_BYTES) return fail(413, "TOO_LARGE", "That file is over 5 MB.");
    const res = await extractCvFileText(file).catch(() => null);
    if (!res) return fail(422, "UNREADABLE", "Couldn't read that file. Try a PDF or Word file.");
    if (!res.ok) return fail(res.status, res.status === 415 ? "UNSUPPORTED" : "UNREADABLE", res.error);
    return { text: res.text, label: `Imported from ${file.name}`.slice(0, 80) };
  }

  let body: { text?: unknown } | null = null;
  try {
    body = await request.json();
  } catch {
    return fail(400, "BAD_REQUEST", "Send a file or the CV text.");
  }
  const text = typeof body?.text === "string" ? body.text.replace(/ /g, " ").replace(/\r\n/g, "\n").trim() : "";
  if (text.length < MIN_TEXT) return fail(422, "TOO_SHORT", "That's too short to be a CV. Paste the whole thing.");
  return { text, label: "Imported from pasted text" };
}

// POST /api/cv/import — a CV file (multipart `file`: PDF, DOCX, TXT) or
// pasted text (JSON `{ text }`) becomes a new CV.
// Validation and text extraction answer with plain JSON errors. Parsing then
// streams `data: {json}\n\n` frames:
//   partial (the CV as parsed so far) … done { id } | error { error, code }
// The parse copies text verbatim (lib/optimizer/parseCv). The parsed original
// is kept as version 1 so it can always be restored.
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return fail(503, "UNAVAILABLE", "Import isn't available right now. Start blank instead.");

  const owner = await ensureOwner();
  const who = ownerKey(owner, clientIp(request));
  // Two limits: a loose one on every request (file reading costs CPU), and
  // the real one only on requests that reach the model, so a rejected file
  // (wrong format, empty) never uses up someone's imports.
  const rough = await limit({ name: "cv-import-req", id: who, cap: 60, windowSec: 3600 });
  if (!rough.ok) return limitResponse(rough);

  const source = await readSource(request);
  if (source instanceof Response) return source;

  const rl = await limit({ name: "cv-import", id: who, cap: owner.userId ? 20 : 8, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);
  const anon = await limitSignedOut(request, !!owner.userId, { name: "cv-import", perIpHour: 10, globalDay: 600 });
  if (anon) return anon;
  if (source.text.length > MAX_TEXT) source.text = source.text.slice(0, MAX_TEXT);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const abort = new AbortController();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: ImportEvent) => {
        try {
          controller.enqueue(frame(e));
        } catch {
          // client went away; the abort below stops the model call
        }
      };
      try {
        const { resumeData, degraded } = await parseCvTextStreaming(
          anthropic,
          source.text,
          (partial) => send({ type: "partial", content: partial }),
          { signal: abort.signal },
        );
        if (degraded) {
          send({ type: "error", code: "NO_CV", error: "Couldn't find a CV in that file. Paste the text or start blank." });
          return;
        }
        if (owner.userId) await ensureUser(owner.userId);
        const doc = { ...emptyDocument(), content: normalizeContent(resumeData) };
        const created = await createResume(owner, { doc, source: "import" });
        await createVersion(created.id, owner, { label: source.label, createdBy: "import" });
        send({ type: "done", id: created.id });
      } catch (err) {
        if (abort.signal.aborted) return;
        console.error("[cv:import]", err);
        send({ type: "error", code: "INTERNAL", error: "Import failed. Try again, or start blank." });
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no" },
  });
}

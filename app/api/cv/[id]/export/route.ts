import { THEME_COLOR_VALUES, type ThemeColor } from "@/lib/design/accents";
import { wordBuffer } from "@/lib/export/docx";
import { attachmentHeader, cvFileBase } from "@/lib/export/filename";
import { clientIp, limit, limitResponse } from "@/lib/limits";
import { currentOwner, ownerKey } from "@/lib/resume/owner";
import { toPlainText } from "@/lib/resume/plainText";
import { loadResume } from "@/lib/resume/store";
import { toTemplateData } from "@/lib/resume/view";

export const dynamic = "force-dynamic";

// GET /api/cv/[id]/export?format=docx|txt — the saved CV as a download.
// Always reads the stored document (the client flushes pending edits first).
// PDF is the browser's print path (vector, selectable text), not this route.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format") ?? "docx";
  if (format !== "docx" && format !== "txt") return Response.json({ error: "Unknown format", code: "BAD_REQUEST" }, { status: 400 });

  const owner = await currentOwner();
  if (!owner) return Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });
  const rl = await limit({ name: "cv-export", id: ownerKey(owner, clientIp(request)), cap: 60, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);

  const cv = await loadResume(id, owner);
  if (!cv) return Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });
  const base = cvFileBase(cv.doc.content.personalInfo.name);
  const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };

  if (format === "txt") {
    return new Response(toPlainText(cv.doc.content), {
      headers: { ...headers, "content-type": "text/plain; charset=utf-8", "content-disposition": attachmentHeader(`${base}.txt`) },
    });
  }
  try {
    const accent = THEME_COLOR_VALUES[cv.doc.design.accentColor as ThemeColor]?.dark;
    const buf = await wordBuffer(toTemplateData(cv.doc.content), { accent });
    return new Response(new Uint8Array(buf), {
      headers: {
        ...headers,
        "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "content-disposition": attachmentHeader(`${base}.docx`),
      },
    });
  } catch (err) {
    console.error("[cv:export:docx]", err);
    return Response.json({ error: "Word export failed. Try PDF.", code: "INTERNAL" }, { status: 500 });
  }
}

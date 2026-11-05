import { attachmentHeader, cvFileBase } from "@/lib/export/filename";
import { appOrigins, MAX_PRINT_HTML, MissingAssets, renderPdf } from "@/lib/export/pdfRender";
import { clientIp, limit, limitResponse } from "@/lib/limits";
import { currentOwner, ownerKey } from "@/lib/resume/owner";
import { loadResume } from "@/lib/resume/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/cv/[id]/pdf — body: the editor's print document (text/html).
// Returns a real PDF file. Only the CV's owner may print through it, so it
// can't serve as an open HTML-to-PDF service.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await currentOwner();
  if (!owner) return Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });
  const rl = await limit({ name: "cv-pdf", id: ownerKey(owner, clientIp(request)), cap: 30, windowSec: 3600 });
  if (!rl.ok) return limitResponse(rl);

  const cv = await loadResume(id, owner);
  if (!cv) return Response.json({ error: "CV not found", code: "NOT_FOUND" }, { status: 404 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_PRINT_HTML) return Response.json({ error: "This CV is too large to export. Try Word.", code: "TOO_LARGE" }, { status: 413 });
  const html = await request.text();
  if (!html.trim() || html.length > MAX_PRINT_HTML) return Response.json({ error: "Export failed. Try again.", code: "BAD_REQUEST" }, { status: 400 });

  try {
    const pdf = await renderPdf(html, appOrigins(request.url));
    return new Response(pdf as BodyInit, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": attachmentHeader(`${cvFileBase(cv.doc.content.personalInfo.name)}.pdf`),
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[cv:pdf]", err instanceof MissingAssets ? err.urls : err);
    return Response.json({ error: "Couldn't make the PDF.", code: "INTERNAL" }, { status: 500 });
  }
}

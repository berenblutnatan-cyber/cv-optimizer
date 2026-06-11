import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { extractText } from "unpdf";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 20_000;

// POST /api/chat/parse-cv
//
// Extracts plain text from an uploaded CV so the chat agent can mine it.
// PDF via unpdf (same as /api/analyze) and plain-text files. DOCX is parsed
// nowhere in this codebase (the `docx` dep only WRITES files), so we ask for
// a PDF export instead of silently feeding XML soup to the model.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let file: File | null = null;
  try {
    const formData = await request.formData();
    file = formData.get("file") as File | null;
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large — 5MB max." }, { status: 413 });
  }

  const name = (file.name || "").toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isText =
    file.type.startsWith("text/") || /\.(txt|md|rtf)$/.test(name) || file.type === "";
  if (!isPdf && !isText) {
    return NextResponse.json(
      { error: "That format isn't supported — export your CV as a PDF and try again." },
      { status: 415 }
    );
  }

  let text = "";
  try {
    if (isPdf) {
      const arrayBuffer = await file.arrayBuffer();
      const extracted = await extractText(arrayBuffer);
      text = Array.isArray(extracted.text) ? extracted.text.join("\n") : extracted.text;
    } else {
      text = await file.text();
    }
  } catch (err) {
    console.error("[chat/parse-cv] extraction failed:", err);
    return NextResponse.json(
      { error: "Couldn't read that file — try re-exporting it as a PDF." },
      { status: 422 }
    );
  }

  // Normalize PDF-extraction artifacts: NBSP -> space, strip zero-width chars.
  text = text
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b\u200c\u200d\ufeff]/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (text.length < 50) {
    return NextResponse.json(
      { error: "That file looks empty or image-only. If it's a scanned CV, paste the text instead." },
      { status: 422 }
    );
  }

  return NextResponse.json({ text: text.slice(0, MAX_TEXT_CHARS), fileName: file.name });
}

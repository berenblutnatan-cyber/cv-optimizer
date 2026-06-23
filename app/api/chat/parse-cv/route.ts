import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { extractCvFileText } from "@/lib/cvFileText";
import { chatRateLimit } from "@/lib/chat/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 20_000;

// POST /api/chat/parse-cv
//
// Extracts plain text from an uploaded CV so the chat agent can mine it.
// PDF via unpdf, DOCX via mammoth, plus plain-text files. Legacy binary .doc
// isn't supported — we ask for a PDF/DOCX export instead of feeding the
// model garbage.
export async function POST(request: NextRequest) {
  // Public for the chat-first home (logged-out visitors upload their CV before
  // signing up). Bounded by per-IP / per-user hourly caps.
  const { userId } = await auth();
  const rl = await chatRateLimit(request, userId, "parse");
  if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });

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

  let text = "";
  try {
    const result = await extractCvFileText(file);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    text = result.text;
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

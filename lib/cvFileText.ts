// Shared CV file → plain text extraction for the upload endpoints
// (/api/chat/parse-cv and /api/analyze). PDF via unpdf, DOCX via mammoth,
// plain-text passthrough. Legacy binary .doc is rejected with guidance —
// nothing in the Node ecosystem reads it reliably without LibreOffice.

import { extractText } from "unpdf";
import mammoth from "mammoth";

export type CvFileTextResult =
  | { ok: true; text: string }
  | { ok: false; status: number; error: string };

export function isPdfFile(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  return file.type === "application/pdf" || name.endsWith(".pdf");
}

export function isDocxFile(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  return (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  );
}

function isTextFile(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  return file.type.startsWith("text/") || /\.(txt|md|rtf)$/.test(name) || file.type === "";
}

export async function extractCvFileText(file: File): Promise<CvFileTextResult> {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".doc") && !name.endsWith(".docx")) {
    return {
      ok: false,
      status: 415,
      error:
        "Old-style .doc files aren't supported — save it as .docx or PDF and try again.",
    };
  }
  if (!isPdfFile(file) && !isDocxFile(file) && !isTextFile(file)) {
    return {
      ok: false,
      status: 415,
      error: "That format isn't supported — upload a PDF, DOCX, or text file.",
    };
  }

  let text = "";
  if (isPdfFile(file)) {
    const arrayBuffer = await file.arrayBuffer();
    const extracted = await extractText(arrayBuffer);
    text = Array.isArray(extracted.text) ? extracted.text.join("\n") : extracted.text;
  } else if (isDocxFile(file)) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else {
    text = await file.text();
  }

  // Normalize extraction artifacts: NBSP → space, strip zero-width chars.
  text = text
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b\u200c\u200d\ufeff]/g, "")
    .replace(/\r\n/g, "\n")
    .trim();

  if (text.length < 50) {
    return {
      ok: false,
      status: 422,
      error:
        "That file looks empty or image-only. If it's a scanned CV, paste the text instead.",
    };
  }
  return { ok: true, text };
}

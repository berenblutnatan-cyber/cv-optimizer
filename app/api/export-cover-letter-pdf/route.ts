import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

function sanitizeForWinAnsi(text: string) {
  return (
    text
      .replaceAll("\u2013", "-")
      .replaceAll("\u2014", "-")
      .replaceAll("\u2212", "-")
      .replaceAll("\u2018", "'")
      .replaceAll("\u2019", "'")
      .replaceAll("\u201c", '"')
      .replaceAll("\u201d", '"')
      .replaceAll("\u2026", "...")
      .replace(/[\u2500-\u257F]/g, "|")
      .replace(/[\u2580-\u259F]/g, "#")
  );
}

type PDFFontLike = {
  widthOfTextAtSize: (text: string, size: number) => number;
};

function wrapLineToWidth(line: string, maxWidth: number, font: PDFFontLike, fontSize: number): string[] {
  if (line.trim() === "") return [""];
  const words = line.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(next, fontSize);
    if (width <= maxWidth) {
      current = next;
      continue;
    }
    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word);
      current = "";
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const text = sanitizeForWinAnsi(((body?.text as string | undefined) ?? "").trim());
    const fileName = (body?.fileName as string | undefined) ?? "Cover-Letter.pdf";

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontSize = 11;
    const lineHeight = Math.round(fontSize * 1.55 * 10) / 10;

    const pageSize: [number, number] = [612, 792]; // US Letter
    const margin = 54;

    let page = pdfDoc.addPage(pageSize);
    let { width, height } = page.getSize();
    const usableWidth = width - margin * 2;
    let y = height - margin;

    const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
    for (const raw of paragraphs) {
      const line = raw.trimEnd();
      if (line.trim() === "") {
        y -= lineHeight * 0.9;
        continue;
      }

      const wrapped = wrapLineToWidth(line, usableWidth, font, fontSize);
      for (const wLine of wrapped) {
        if (y < margin + lineHeight) {
          page = pdfDoc.addPage(pageSize);
          ({ width, height } = page.getSize());
          y = height - margin;
        }
        page.drawText(wLine, {
          x: margin,
          y: y - fontSize,
          size: fontSize,
          font,
          color: rgb(0.08, 0.08, 0.08),
        });
        y -= lineHeight;
      }
    }

    const bytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, "")}"`,
      },
    });
  } catch (error) {
    console.error("export-cover-letter-pdf error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF" },
      { status: 500 }
    );
  }
}



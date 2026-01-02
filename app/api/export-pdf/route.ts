import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

function sanitizeForWinAnsi(text: string) {
  // pdf-lib StandardFonts use WinAnsi encoding (not full Unicode). Replace common
  // CV glyphs that frequently break PDF generation (box drawing / block elements).
  // This keeps output readable while avoiding "WinAnsi cannot encode" crashes.
  return (
    text
      // Box drawing
      .replaceAll("\u2502", "|") // │
      .replaceAll("\u2500", "-") // ─
      .replaceAll("\u250c", "+") // ┌
      .replaceAll("\u2510", "+") // ┐
      .replaceAll("\u2514", "+") // └
      .replaceAll("\u2518", "+") // ┘
      .replace(/[\u2500-\u257F]/g, "|")
      // Block elements
      .replace(/[\u2580-\u259F]/g, "#")
      // Common punctuation variants
      .replaceAll("\u2013", "-") // –
      .replaceAll("\u2014", "-") // —
      .replaceAll("\u2212", "-") // −
      .replaceAll("\u2018", "'") // ‘
      .replaceAll("\u2019", "'") // ’
      .replaceAll("\u201c", '"') // “
      .replaceAll("\u201d", '"') // ”
      .replaceAll("\u2026", "...") // …
  );
}

type PDFFontLike = {
  widthOfTextAtSize: (text: string, size: number) => number;
};

function wrapLineToWidth(line: string, maxWidth: number, font: PDFFontLike, fontSize: number): string[] {
  // Preserve empty lines exactly
  if (line.trim() === "") return [""];

  // Preserve leading whitespace (indent/bullets alignment)
  const leadingWhitespaceMatch = line.match(/^\s+/);
  const prefix = leadingWhitespaceMatch ? leadingWhitespaceMatch[0] : "";
  const content = line.slice(prefix.length);

  const words = content.split(/\s+/);
  const lines: string[] = [];

  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(prefix + next, fontSize);
    if (width <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(prefix + current);
      current = word;
      continue;
    }

    // Single "word" longer than max width: hard-split by chars
    let chunk = "";
    for (const ch of word) {
      const candidate = chunk + ch;
      const w = font.widthOfTextAtSize(prefix + candidate, fontSize);
      if (w > maxWidth && chunk) {
        lines.push(prefix + chunk);
        chunk = ch;
      } else {
        chunk = candidate;
      }
    }
    current = chunk;
  }

  if (current) lines.push(prefix + current);
  return lines;
}

function wrapTextToWidth(text: string, maxWidth: number, font: PDFFontLike, fontSize: number): string[] {
  const rawLines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const raw of rawLines) {
    const wrapped = wrapLineToWidth(raw, maxWidth, font, fontSize);
    out.push(...wrapped);
  }
  return out;
}

function isSectionHeader(line: string) {
  const t = line.trim();
  if (!t) return false;
  // Common headers: "EXPERIENCE", "SKILLS", "EDUCATION", "PROJECTS", etc.
  const upperish = t === t.toUpperCase() && /[A-Z]/.test(t) && t.length <= 40;
  const colonHeader = /^[A-Z][A-Za-z0-9 &/+\-]{2,50}:\s*$/.test(t);
  return upperish || colonHeader;
}

function looksLikeContact(line: string) {
  const t = line.trim();
  if (!t) return false;
  const isEmail = /@/.test(t);
  const isUrl = /(https?:\/\/|www\.)/i.test(t);
  const isLinkedIn = /linkedin\.com/i.test(t);
  const isPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(t);
  return isEmail || isUrl || isLinkedIn || isPhone;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const text = sanitizeForWinAnsi(((body?.text as string | undefined) ?? ""));
    const fileName = (body?.fileName as string | undefined) ?? "Optimized-CV.pdf";

    if (!text.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Baseline "template" rendering (consistent design)
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageSize: [number, number] = [612, 792]; // US Letter
    const pageMargin = 54;
    const bodyFontSize = 10.5;
    const bodyLineHeight = Math.round(bodyFontSize * 1.45 * 10) / 10;
    const headingFontSize = 11.5;
    const nameFontSize = 18;
    const contactFontSize = 9.5;

    const rawLines = text.replace(/\r\n/g, "\n").split("\n");
    const firstNonEmptyIdx = rawLines.findIndex((l) => l.trim().length > 0);
    const nameLine = firstNonEmptyIdx >= 0 ? rawLines[firstNonEmptyIdx].trim() : "Optimized CV";

    // Collect contact lines just below name (up to 3) if they look like contact info
    const contactLines: string[] = [];
    let i = firstNonEmptyIdx + 1;
    while (i < rawLines.length && contactLines.length < 3) {
      const t = rawLines[i].trim();
      if (!t) break;
      if (looksLikeContact(t) || t.length <= 60) {
        contactLines.push(t);
        i++;
      } else {
        break;
      }
    }

    // Remaining body starts after optional blank line following header/contact
    while (i < rawLines.length && rawLines[i].trim() === "") i++;
    const bodyLines = rawLines.slice(i);

    let page = pdfDoc.addPage(pageSize);
    let { width, height } = page.getSize();
    const usableWidth = width - pageMargin * 2;
    let y = height - pageMargin;

    const drawWrapped = (line: string, opts: { x: number; font: any; size: number; color?: any }) => {
      const wrapped = wrapLineToWidth(line, usableWidth - (opts.x - pageMargin), opts.font, opts.size);
      for (const wLine of wrapped) {
        if (y < pageMargin + bodyLineHeight) {
          page = pdfDoc.addPage(pageSize);
          ({ width, height } = page.getSize());
          y = height - pageMargin;
        }
        page.drawText(wLine, {
          x: opts.x,
          y: y - opts.size,
          size: opts.size,
          font: opts.font,
          color: opts.color ?? rgb(0.08, 0.08, 0.08),
        });
        y -= bodyLineHeight;
      }
    };

    // Header: Name
    drawWrapped(nameLine, { x: pageMargin, font: fontBold, size: nameFontSize, color: rgb(0.05, 0.05, 0.05) });
    y -= 2;

    // Header: Contact line(s)
    if (contactLines.length > 0) {
      const contactText = contactLines.join("  •  ");
      const wrapped = wrapLineToWidth(contactText, usableWidth, fontRegular, contactFontSize);
      for (const cLine of wrapped) {
        if (y < pageMargin + bodyLineHeight) {
          page = pdfDoc.addPage(pageSize);
          ({ width, height } = page.getSize());
          y = height - pageMargin;
        }
        page.drawText(cLine, {
          x: pageMargin,
          y: y - contactFontSize,
          size: contactFontSize,
          font: fontRegular,
          color: rgb(0.25, 0.25, 0.25),
        });
        y -= bodyLineHeight;
      }
    }

    // Divider
    y -= 6;
    page.drawLine({
      start: { x: pageMargin, y },
      end: { x: width - pageMargin, y },
      thickness: 1,
      color: rgb(0.85, 0.87, 0.9),
    });
    y -= 10;

    // Body rendering with simple styling heuristics
    for (const raw of bodyLines) {
      const line = raw.replace(/\t/g, "  ");
      const t = line.trim();

      if (!t) {
        y -= bodyLineHeight * 0.6;
        continue;
      }

      if (isSectionHeader(t)) {
        y -= 4;
        const header = t.replace(/:\s*$/, "");
        drawWrapped(header.toUpperCase(), { x: pageMargin, font: fontBold, size: headingFontSize, color: rgb(0.1, 0.2, 0.35) });
        y -= 2;
        continue;
      }

      const isBullet = /^(\s*[-*]\s+|\s*•\s+)/.test(line);
      if (isBullet) {
        const cleaned = line.replace(/^(\s*[-*]\s+|\s*•\s+)/, "").trim();
        // Draw bullet + text with indent
        const bulletX = pageMargin;
        const textX = pageMargin + 14;
        if (y < pageMargin + bodyLineHeight) {
          page = pdfDoc.addPage(pageSize);
          ({ width, height } = page.getSize());
          y = height - pageMargin;
        }
        page.drawText("•", {
          x: bulletX,
          y: y - bodyFontSize,
          size: bodyFontSize,
          font: fontRegular,
          color: rgb(0.08, 0.08, 0.08),
        });
        const wrapped = wrapLineToWidth(cleaned, usableWidth - 14, fontRegular, bodyFontSize);
        for (const [idx, w] of wrapped.entries()) {
          if (y < pageMargin + bodyLineHeight) {
            page = pdfDoc.addPage(pageSize);
            ({ width, height } = page.getSize());
            y = height - pageMargin;
          }
          page.drawText(w, {
            x: textX,
            y: y - bodyFontSize,
            size: bodyFontSize,
            font: fontRegular,
            color: rgb(0.08, 0.08, 0.08),
          });
          y -= bodyLineHeight;
          // For wrapped bullet lines after the first, don't repeat bullet; indent stays
          if (idx === 0) {
            // already drew bullet, nothing else
          }
        }
        continue;
      }

      // Normal line
      drawWrapped(line.trimEnd(), { x: pageMargin, font: fontRegular, size: bodyFontSize });
    }

    const bytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, "")}"`,
      },
    });
  } catch (error) {
    console.error("export-pdf error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF" },
      { status: 500 }
    );
  }
}



// What an uploaded PDF looks like, read from the PDF itself: where the
// coloured blocks are, which colour the headings use, serif or sans, whether
// there are two columns, and the photo. No model call: the drawing commands
// say exactly what is on the page, so the answer is deterministic and tested
// against real PDFs (test/fixtures/pdf, made by scripts/make-design-fixtures.mjs).
//
// Text extraction (lib/cvFileText) throws all of this away; this is what lets
// an import keep the design the person already chose.

import { getDocumentProxy, getResolvedPDFJS } from "unpdf";
import jpeg from "jpeg-js";
import type { AccentHex } from "@/lib/design/accents";
import { PHOTO_MAX_CHARS, squareCrop } from "@/lib/resume/photo";

export type FontKind = "serif" | "sans" | "mono";

export type PdfDesign = {
  /** A full-height coloured column beside the main text. */
  sidebar: { side: "left" | "right"; color: AccentHex; dark: boolean } | null;
  /** A full-width coloured block across the top. */
  band: { color: AccentHex } | null;
  /** Two text columns without a coloured sidebar. */
  columns: boolean;
  /** The colour the CV is "in": the sidebar or band, else the headings. Null when it's all black and grey. */
  accent: AccentHex | null;
  headingFont: FontKind;
  bodyFont: FontKind;
  /** A headshot found on page 1, as a small square JPEG (lib/resume/photo rules). */
  photo: string | null;
};

type Matrix = [number, number, number, number, number, number];
type Rect = { x0: number; y0: number; x1: number; y1: number };

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];
const apply = (m: Matrix, x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
function box(m: Matrix, x0: number, y0: number, x1: number, y1: number): Rect {
  const pts = [apply(m, x0, y0), apply(m, x1, y0), apply(m, x0, y1), apply(m, x1, y1)];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

// ── Colour ─────────────────────────────────────────────────────────────────

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
function hsl(hex: string) {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  return { s, l };
}
/** A colour someone chose, not black, white or a grey. */
export const isChroma = (hex: string) => {
  const { s, l } = hsl(hex);
  return s >= 0.2 && l >= 0.08 && l <= 0.93;
};
const isPaper = (hex: string) => hsl(hex).l >= 0.97;
const hexOf = (v: unknown): AccentHex | null => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? (v.toLowerCase() as AccentHex) : null);

// ── Fonts ──────────────────────────────────────────────────────────────────

const SERIF = /serif(?!.*sans)|times|georgia|garamond|cambria|baskerville|palatino|book ?antiqua|merriweather|playfair|lora|minion|caslon|didot|bodoni|charter|crimson|libre ?baskerville|pt ?serif|noto ?serif|source ?serif|tiempos|frank ?ruhl|david/i;
const MONO = /mono|courier|consolas|menlo|monaco|code|inconsolata/i;
export function fontKind(name: string): FontKind {
  const n = name.replace(/^[A-Z]{6}\+/, "");
  if (MONO.test(n)) return "mono";
  if (/sans/i.test(n)) return "sans";
  return SERIF.test(n) ? "serif" : "sans";
}

// ── Photo ──────────────────────────────────────────────────────────────────

type PdfImage = { width: number; height: number; data: Uint8Array | Uint8ClampedArray; kind: number };

/** Square-crop, shrink and JPEG-encode a decoded PDF image until it fits a CV photo. */
export function photoFromPixels(img: PdfImage): string | null {
  const channels = img.kind === 3 ? 4 : img.kind === 2 ? 3 : 0;
  if (!channels || img.data.length < img.width * img.height * channels) return null;
  const { sx, sy, side } = squareCrop(img.width, img.height);
  for (const size of [240, 200, 160, 128]) {
    const out = Math.min(size, side);
    const rgba = new Uint8Array(out * out * 4);
    const step = side / out;
    for (let y = 0; y < out; y++) {
      for (let x = 0; x < out; x++) {
        // Box filter: average the source pixels this output pixel covers.
        const fx = sx + Math.floor(x * step), tx = sx + Math.max(Math.floor((x + 1) * step), Math.floor(x * step) + 1);
        const fy = sy + Math.floor(y * step), ty = sy + Math.max(Math.floor((y + 1) * step), Math.floor(y * step) + 1);
        let r = 0, g = 0, b = 0, n = 0;
        for (let yy = fy; yy < ty; yy++) {
          for (let xx = fx; xx < tx; xx++) {
            const i = (yy * img.width + xx) * channels;
            const a = channels === 4 ? img.data[i + 3] / 255 : 1;
            // Transparent corners (a round mask) become white, like paper.
            r += img.data[i] * a + 255 * (1 - a);
            g += img.data[i + 1] * a + 255 * (1 - a);
            b += img.data[i + 2] * a + 255 * (1 - a);
            n++;
          }
        }
        const o = (y * out + x) * 4;
        rgba[o] = r / n;
        rgba[o + 1] = g / n;
        rgba[o + 2] = b / n;
        rgba[o + 3] = 255;
      }
    }
    const encoded = jpeg.encode({ data: rgba, width: out, height: out }, 82).data;
    const url = `data:image/jpeg;base64,${Buffer.from(encoded).toString("base64")}`;
    if (url.length <= PHOTO_MAX_CHARS) return url;
  }
  return null;
}

// ── The read ───────────────────────────────────────────────────────────────

type Glyph = { unicode?: string } | number | null;
const countGlyphs = (glyphs: unknown) =>
  Array.isArray(glyphs) ? (glyphs as Glyph[]).filter((g) => g && typeof g === "object" && !!g.unicode?.trim()).length : 0;

/** Read page 1's design. Null when the file can't be read as a PDF; any part it can't tell is left neutral. */
export async function readPdfDesign(bytes: Uint8Array): Promise<PdfDesign | null> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | null = null;
  try {
    pdf = await getDocumentProxy(bytes);
    const { OPS } = await getResolvedPDFJS();
    const page = await pdf.getPage(1);
    const { width: W, height: H } = page.getViewport({ scale: 1 });
    const ops = await page.getOperatorList();

    let ctm: Matrix = IDENTITY;
    let fill = "#000000";
    const stack: { ctm: Matrix; fill: string }[] = [];
    const fills: { rect: Rect; color: AccentHex }[] = [];
    const textColor = new Map<AccentHex, number>();
    const images: { rect: Rect; ref: unknown }[] = [];

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i] as unknown[];
      if (fn === OPS.save) stack.push({ ctm, fill });
      else if (fn === OPS.restore) ({ ctm, fill } = stack.pop() ?? { ctm: IDENTITY, fill: "#000000" });
      else if (fn === OPS.transform) ctm = multiply(args as unknown as Matrix, ctm);
      else if (fn === OPS.setFillRGBColor || fn === OPS.setFillGray || fn === OPS.setFillCMYKColor) fill = hexOf(args[0]) ?? fill;
      else if (fn === OPS.constructPath) {
        // pdf.js 5: [paint op, path data, bbox]. Only filled shapes are blocks.
        const [paint, , bbox] = args as [number, unknown, ArrayLike<number> | null];
        const filled = paint === OPS.fill || paint === OPS.eoFill || paint === OPS.fillStroke || paint === OPS.eoFillStroke;
        const color = hexOf(fill);
        if (filled && bbox && color && !isPaper(color)) fills.push({ rect: box(ctm, bbox[0], bbox[1], bbox[2], bbox[3]), color });
      } else if (fn === OPS.showText || fn === OPS.showSpacedText) {
        const color = hexOf(fill);
        if (color) textColor.set(color, (textColor.get(color) ?? 0) + countGlyphs(args[0]));
      } else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
        images.push({ rect: box(ctm, 0, 0, 1, 1), ref: args[0] });
      }
    }

    // Coloured blocks.
    const tall = fills.filter(({ rect: r }) => r.y1 - r.y0 >= 0.55 * H && r.x1 - r.x0 >= 0.15 * W && r.x1 - r.x0 <= 0.48 * W);
    const side = tall.find(({ rect: r }) => r.x0 <= 0.03 * W) ?? tall.find(({ rect: r }) => r.x1 >= 0.97 * W);
    const sidebar = side
      ? { side: side.rect.x0 <= 0.03 * W ? ("left" as const) : ("right" as const), color: side.color, dark: hsl(side.color).l < 0.45 }
      : null;
    const top = fills.find(({ rect: r }) => r.x1 - r.x0 >= 0.85 * W && r.y1 >= 0.96 * H && r.y1 - r.y0 >= 0.05 * H && r.y1 - r.y0 <= 0.4 * H);
    const band = top ? { color: top.color } : null;

    // Text: fonts by size, columns by where lines start.
    const text = await page.getTextContent();
    const items = (text.items as { str?: string; transform?: number[]; fontName?: string; height?: number }[]).filter(
      (t) => (t.str ?? "").trim().length > 0 && Array.isArray(t.transform),
    );
    const sizes = items.flatMap((t) => Array((t.str ?? "").length).fill(t.height ?? 0)).sort((a, b) => a - b);
    const body = sizes[Math.floor(sizes.length / 2)] ?? 0;
    const fontName = (key: string) => {
      try {
        return (page.commonObjs.get(key) as { name?: string } | null)?.name ?? key;
      } catch {
        return key;
      }
    };
    const vote = (pick: (h: number) => boolean): FontKind => {
      const tally: Record<FontKind, number> = { serif: 0, sans: 0, mono: 0 };
      for (const t of items) if (pick(t.height ?? 0)) tally[fontKind(fontName(t.fontName ?? ""))] += (t.str ?? "").length;
      const [winner, n] = (Object.entries(tally) as [FontKind, number][]).sort((a, b) => b[1] - a[1])[0];
      return n > 0 ? winner : "sans";
    };
    const bodyFont = vote((h) => Math.abs(h - body) <= body * 0.12);
    const headingFont = sizes.some((h) => h >= body * 1.3) ? vote((h) => h >= body * 1.3) : bodyFont;

    let left = 0, right = 0, rightLines = 0;
    for (const t of items) {
      const x = t.transform![4];
      const n = (t.str ?? "").trim().length;
      if (n < 3) continue;
      if (x < 0.35 * W) left += n;
      else if (x >= 0.4 * W && x < 0.75 * W) {
        right += n;
        rightLines++;
      }
    }
    const total = left + right;
    const columns = !sidebar && total > 0 && left / total >= 0.2 && right / total >= 0.2 && rightLines >= 8;

    // The accent: what covers the most page (a coloured sidebar or band), else the headings' colour.
    const headingColor = [...textColor.entries()].filter(([c]) => isChroma(c)).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const blockColor = [sidebar?.color, band?.color].find((c): c is AccentHex => !!c && isChroma(c) && hsl(c).l < 0.8) ?? null;
    const accent = blockColor ?? headingColor;

    // The photo: a squarish picture near the top, not a logo strip or a background.
    let photo: string | null = null;
    const candidates = images
      .map((im) => ({ ...im, w: im.rect.x1 - im.rect.x0, h: im.rect.y1 - im.rect.y0 }))
      .filter(({ w, h, rect }) => w / h >= 0.6 && w / h <= 1.67 && (w * h) / (W * H) >= 0.003 && (w * h) / (W * H) <= 0.12 && rect.y1 >= 0.5 * H)
      .sort((a, b) => b.w * b.h - a.w * a.h);
    for (const c of candidates) {
      let img: PdfImage | null = null;
      try {
        img = (typeof c.ref === "string" ? page.objs.get(c.ref) : c.ref) as PdfImage | null;
      } catch {
        img = null;
      }
      if (img?.data && img.width >= 48 && img.height >= 48) photo = photoFromPixels(img);
      if (photo) break;
    }

    return { sidebar, band, columns, accent, headingFont, bodyFont, photo };
  } catch {
    return null;
  } finally {
    await pdf?.destroy().catch(() => {});
  }
}

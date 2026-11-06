import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import jpeg from "jpeg-js";
import { colorDistance } from "@/lib/design/accents";
import { isPhotoDataUrl } from "@/lib/resume/photo";
import { DEFAULT_DESIGN } from "@/lib/resume/document";
import { fontKind, readPdfDesign, type PdfDesign } from "./pdfDesign";
import { designFromPdf, layoutOf } from "./mapDesign";

// Real PDFs, printed by Chrome in five designs (scripts/make-design-fixtures.mjs).
// Before this, every import opened in the default design (minimalist, slate)
// whatever the file looked like: these pin that the file's own design is read
// and kept.

const read = async (name: string) => {
  const d = await readPdfDesign(new Uint8Array(readFileSync(join(process.cwd(), "test/fixtures/pdf", `${name}.pdf`))));
  if (!d) throw new Error(`couldn't read ${name}`);
  return d;
};
const close = (a: string | null, b: string) => !!a && colorDistance(a, b) < 30;

describe("reading a PDF's design", () => {
  it("finds a dark left sidebar, its colour, the serif text and the photo", async () => {
    const d = await read("teal-sidebar-photo");
    expect(d.sidebar).toMatchObject({ side: "left", dark: true });
    expect(close(d.sidebar!.color, "#0f3d3e")).toBe(true);
    expect(close(d.accent, "#0f3d3e")).toBe(true);
    expect(d.headingFont).toBe("serif");
    expect(d.band).toBeNull();
    expect(isPhotoDataUrl(d.photo)).toBe(true);
  });

  it("keeps the photo a real picture: square, and the colours of the original", async () => {
    const d = await read("teal-sidebar-photo");
    const img = jpeg.decode(Buffer.from(d.photo!.split(",")[1], "base64"), { useTArray: true });
    expect(img.width).toBe(img.height);
    // The fixture's face colour (#e0b89a) sits in the middle of the frame.
    const mid = ((img.height >> 1) * img.width + (img.width >> 1)) * 4;
    const hex = `#${[0, 1, 2].map((k) => img.data[mid + k].toString(16).padStart(2, "0")).join("")}`;
    expect(colorDistance(hex, "#e0b89a")).toBeLessThan(60);
  });

  it("reads a classic black-and-white serif CV as exactly that", async () => {
    const d = await read("classic-serif");
    expect(d).toMatchObject({ sidebar: null, band: null, columns: false, accent: null, headingFont: "serif", bodyFont: "serif", photo: null });
  });

  it("finds a coloured header band", async () => {
    const d = await read("navy-band");
    expect(close(d.band?.color ?? null, "#1e3a8a")).toBe(true);
    expect(d.sidebar).toBeNull();
    expect(close(d.accent, "#1e3a8a")).toBe(true);
    expect(d.bodyFont).toBe("sans");
  });

  it("finds a pale right sidebar, and takes the accent from the headings, not the tint", async () => {
    const d = await read("rose-right-sidebar");
    expect(d.sidebar).toMatchObject({ side: "right", dark: false });
    expect(close(d.accent, "#be123c")).toBe(true);
  });

  it("tells two plain columns from one", async () => {
    expect((await read("two-column-plain")).columns).toBe(true);
    expect((await read("classic-serif")).columns).toBe(false);
  });

  it("answers null for something that isn't a PDF", async () => {
    expect(await readPdfDesign(new TextEncoder().encode("not a pdf"))).toBeNull();
  });
});

describe("matching the file to a Hired design", () => {
  it.each([
    ["teal-sidebar-photo", ["creative", "canvas"]],
    ["classic-serif", ["ivy-league", "ledger"]],
    ["navy-band", ["banner", "bands", "executive"]],
    ["rose-right-sidebar", ["international", "executive"]],
    ["two-column-plain", ["double-column"]],
  ])("%s opens in a matching layout, not the default", async (name, fits) => {
    const design = designFromPdf(await read(name));
    expect(fits).toContain(design.template);
    expect(design.template).not.toBe(DEFAULT_DESIGN.template);
  });

  it("keeps the exact colour when no preset is close, and a preset when one is", async () => {
    expect(designFromPdf(await read("teal-sidebar-photo")).accentColor).toMatch(/^#[0-9a-f]{6}$/);
    expect(designFromPdf(await read("navy-band")).accentColor).toBe("navy");
    expect(designFromPdf(await read("two-column-plain")).accentColor).toBe("blue");
    // Black and grey stays black and grey.
    expect(designFromPdf(await read("classic-serif")).accentColor).toBe("black");
  });

  it("picks a design that can show the photo when the file has one", () => {
    const base: PdfDesign = { sidebar: { side: "left", color: "#0f3d3e", dark: true }, band: null, columns: false, accent: "#0f3d3e", headingFont: "sans", bodyFont: "sans", photo: null };
    expect(layoutOf(base)).toBe("sidebar-left-dark");
    expect(designFromPdf({ ...base, photo: "data:image/jpeg;base64,AA==" }).template).toBe("creative");
  });
});

describe("font names", () => {
  it.each([
    ["CAAAAA+Georgia-Bold", "serif"],
    ["TimesNewRomanPSMT", "serif"],
    ["Calibri", "sans"],
    ["NotoSans-Regular", "sans"],
    ["PTSerif-Regular", "serif"],
    ["SourceSerifPro", "serif"],
    ["CourierNewPSMT", "mono"],
    ["JetBrainsMono-Regular", "mono"],
    ["Helvetica", "sans"],
  ])("%s is %s", (name, kind) => expect(fontKind(name)).toBe(kind));
});

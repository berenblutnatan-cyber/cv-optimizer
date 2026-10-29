import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import mammoth from "mammoth";
import { THEME_COLOR_VALUES } from "@/lib/design/accents";
import { toTemplateData } from "@/lib/resume/view";
import { fullCv } from "@/test/fixtures/fullCv";
import { wordBuffer } from "./docx";
import { attachmentHeader, cvFileBase } from "./filename";

describe("Word export", () => {
  it("contains every section of the CV, verbatim", async () => {
    const doc = fullCv();
    const buf = await wordBuffer(toTemplateData(doc.content));
    const { value: text } = await mammoth.extractRawText({ buffer: buf });
    for (const expected of [
      "Dana Lévi",
      "Senior Product Manager",
      "dana@example.com",
      "Tel Aviv, Israel",
      "Product manager who ships onboarding that converts.",
      "Acme Analytics",
      "Rebuilt onboarding, lifting activation from 31% to 46%",
      "Globex",
      "Tel Aviv University",
      "B.Sc.",
      "SQL",
      "A/B testing",
      "Hebrew (native)",
      "Pricing Lab",
      "Ran 14 pricing tests in a quarter",
      "Pragmatic Product Management",
      "Volunteering",
      "Mentor at Google for Startups",
    ]) {
      expect(text, expected).toContain(expected);
    }
  });

  it("uses the CV's accent colour, not a fixed one", async () => {
    const accent = THEME_COLOR_VALUES.navy.dark.replace("#", "");
    const buf = await wordBuffer(toTemplateData(fullCv().content), { accent });
    const xml = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
    const styles = await (await JSZip.loadAsync(buf)).file("word/styles.xml")!.async("string");
    expect((xml + styles).toLowerCase()).toContain(accent.toLowerCase());
    expect((xml + styles).toLowerCase()).not.toContain("4f46e5");
  });
});

describe("export file names", () => {
  it("keeps letters in any script and drops filesystem-hostile characters", () => {
    expect(cvFileBase("Dana Lévi")).toBe("Dana Lévi CV");
    expect(cvFileBase("דנה לוי")).toBe("דנה לוי CV");
    expect(cvFileBase("a/b\\c:d*e?")).toBe("abcde CV");
    expect(cvFileBase("")).toBe("My CV");
    expect(cvFileBase("   ")).toBe("My CV");
  });

  it("writes a Content-Disposition that survives non-ASCII names", () => {
    const h = attachmentHeader("דנה CV.docx");
    expect(h).toMatch(/^attachment; filename="[\x20-\x7e]+"; filename\*=UTF-8''/);
    expect(decodeURIComponent(h.split("UTF-8''")[1])).toBe("דנה CV.docx");
    expect(attachmentHeader('a"b.docx')).toContain('filename="ab.docx"');
  });
});

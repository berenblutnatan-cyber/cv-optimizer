import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { collapseLetterSpacing } from "@/lib/text/letterSpacing";
import { extractCvFileText } from "@/lib/cvFileText";
import { toResumeData } from "@/lib/optimizer/parseCv";
import { toTemplateData } from "@/lib/resume/view";
import { applyDocumentOp, emptyDocument, normalizeContent, toDocument } from "@/lib/resume/document";
import { accentPalette } from "@/lib/design/accents";
import { getThemeColors } from "@/components/cv-templates/ThemeEngine";
import { headingWords } from "@/components/cv-templates/TemplateRenderer";
import { sanitizeDesign } from "@/lib/chat/cvTools";

// An import keeps the CV's own structure: its section order, its headings as
// written, its exact colour, and the job it's aimed at. Each of these was
// dropped on the way in before.

const parsed = () =>
  toResumeData({
    sections: [
      { kind: "summary", title: "About me" },
      { kind: "education", title: "Studies" },
      { kind: "experience", title: "Work History" },
      { kind: "custom", title: "VOLUNTEERING" },
      { kind: "skills", title: "Toolbox" },
    ],
    personalInfo: { name: "Noa" },
    summary: "Analyst.",
    experience: [{ company: "PayLeaf", role: "Analyst", description: ["Built it"] }],
    education: [{ institution: "Technion", degree: "B.Sc." }],
    skills: ["SQL"],
    customSections: [{ title: "Volunteering", items: ["Mentor"] }],
  });

describe("the CV's own structure survives the parse", () => {
  it("keeps the section order of the file", () => {
    const c = parsed();
    expect(c.sectionOrder).toEqual(["education", "experience", c.customSections[0].id]);
    expect(toTemplateData(c).sections.map((s) => s.id)).toEqual(["education", "experience", c.customSections[0].id]);
  });

  it("keeps the headings as written, in the preview too", () => {
    const c = parsed();
    expect(c.sectionTitles).toEqual({ summary: "About me", education: "Studies", experience: "Work History", skills: "Toolbox" });
    const view = toTemplateData(c);
    expect(view.sections.find((s) => s.id === "experience")?.title).toBe("Work History");
    expect(view.headings).toEqual({ summary: "About me", skills: "Toolbox", languages: undefined });
  });

  it("templates' own words for those headings are replaced, others untouched", () => {
    const words = headingWords({ summary: "About me", skills: "Toolbox" })!;
    expect(words["Professional Summary"]).toBe("About me");
    expect(words["Core Competencies"]).toBe("Toolbox");
    expect(words.Contact).toBeUndefined();
    expect(headingWords(undefined)).toBeNull();
  });

  it("a CV whose headings weren't read keeps the template's words", () => {
    const c = toResumeData({ personalInfo: { name: "Noa" }, summary: "", experience: [], education: [], skills: [] });
    expect(c.sectionTitles).toBeUndefined();
    expect(toTemplateData(c).headings).toBeUndefined();
  });

  it("titles survive storage, and junk in them doesn't", () => {
    const c = normalizeContent({ ...parsed(), sectionTitles: { experience: "  Work History  ", skills: 7, bogus: "x" } });
    expect(c.sectionTitles).toEqual({ experience: "Work History" });
  });
});

describe("the exact colour", () => {
  it("is a valid design colour, kept through storage", () => {
    expect(sanitizeDesign({ accentColor: "#0F3D3E" })?.accentColor).toBe("#0f3d3e");
    expect(sanitizeDesign({ accentColor: "#12" })).toBeNull();
    expect(sanitizeDesign({ accentColor: "url(x)" })).toBeNull();
    const doc = toDocument({ ...emptyDocument(), design: { ...emptyDocument().design, accentColor: "#0f3d3e" } });
    expect(doc.design.accentColor).toBe("#0f3d3e");
  });

  it("paints the templates in that colour, not the indigo fallback", () => {
    expect(getThemeColors("#0f3d3e").primary).toBe("#0f3d3e");
    expect(getThemeColors("navy").primary).toBe("#1e3a8a");
    const p = accentPalette("#0f9b8e");
    expect(p.light).not.toBe(p.primary);
    expect(p.dark).not.toBe(p.primary);
  });
});

describe("the target job", () => {
  it("is set, changed and cleared through the op log, and survives storage", () => {
    let doc = applyDocumentOp(emptyDocument(), "set_target", { title: "  Senior   Data Analyst ", description: "SQL, dbt" });
    expect(doc.target).toEqual({ title: "Senior Data Analyst", description: "SQL, dbt" });
    expect(toDocument(JSON.parse(JSON.stringify(doc))).target).toEqual(doc.target);
    expect(applyDocumentOp(doc, "set_target", { title: "Senior Data Analyst", description: "SQL, dbt" })).toBe(doc);
    doc = applyDocumentOp(doc, "set_target", {});
    expect(doc.target).toBeUndefined();
  });

  it("an edit keeps the target and the original design", () => {
    const doc = { ...emptyDocument(), target: { title: "PM" }, original: { design: { template: "creative" as const, accentColor: "#0f3d3e" as const }, layout: "sidebar-left-dark", photo: true } };
    const next = applyDocumentOp(doc, "update_summary", { summary: "Ships things." });
    expect(next.target).toEqual({ title: "PM" });
    expect(toDocument(JSON.parse(JSON.stringify(next))).original).toEqual(doc.original);
  });
});

describe("a heading belongs to one section", () => {
  it("drops a heading the model gave to two sections (a summary with no heading of its own)", () => {
    const c = toResumeData({
      sections: [
        { kind: "summary", title: "Experience" },
        { kind: "experience", title: "Experience" },
        { kind: "education", title: "Studies" },
      ],
      experience: [{ company: "A", role: "B" }],
      education: [{ institution: "C" }],
    });
    expect(c.sectionTitles).toEqual({ education: "Studies" });
    // The order still comes through: it doesn't depend on the words.
    expect(c.sectionOrder).toEqual(["experience", "education"]);
  });
});

describe("letter-spaced headings", () => {
  it.each([
    ["E X P E R I E N C E", "EXPERIENCE"],
    ["C O N TA C T", "CONTACT"],
    ["V O L U N T E E R I N G\nMentor, Baot", "VOLUNTEERING\nMentor, Baot"],
    ["נ י ס י ו ן", "ניסיון"],
    // Not letter-spacing: left alone.
    ["IT HR QA BI", "IT HR QA BI"],
    ["I am a data analyst", "I am a data analyst"],
    ["Python, SQL, A/B testing", "Python, SQL, A/B testing"],
  ])("%j → %j", (raw, clean) => expect(collapseLetterSpacing(raw)).toBe(clean));

  it("come out of a real letter-spaced PDF joined up", async () => {
    const bytes = readFileSync(join(process.cwd(), "test/fixtures/pdf/teal-sidebar-photo.pdf"));
    const res = await extractCvFileText(new File([bytes], "cv.pdf", { type: "application/pdf" }));
    expect(res.ok && res.text).toContain("EXPERIENCE");
    expect(res.ok && res.text).not.toMatch(/E X P E R/);
  });

  it("are cleaned in parsed headings too (pasted text)", () => {
    const c = toResumeData({ sections: [{ kind: "experience", title: "W O R K" }], customSections: [{ title: "A W A R D S", items: ["x"] }] });
    expect(c.sectionTitles?.experience).toBe("WORK");
    expect(c.customSections[0].title).toBe("AWARDS");
  });
});

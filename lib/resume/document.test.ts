import { describe, expect, it } from "vitest";
import { applyDocumentOp, completeness, DEFAULT_DESIGN, emptyDocument, pinTarget, toDocument } from "./document";
import { initialResumeState } from "@/types/resume";

describe("toDocument", () => {
  it("wraps a v1 row and carries the old template + colour columns into the design", () => {
    const doc = toDocument(
      { ...initialResumeState, personalInfo: { ...initialResumeState.personalInfo, name: "Dana" } },
      { template: "techie", themeColor: "indigo" },
    );
    expect(doc.schemaVersion).toBe(2);
    expect(doc.content.personalInfo.name).toBe("Dana");
    expect(doc.design.template).toBe("techie");
    expect(doc.design.accentColor).toBe("indigo");
  });

  it("drops the old wizard's placeholder summary so it can never be exported", () => {
    const doc = toDocument(initialResumeState);
    expect(initialResumeState.summary).toContain("[X]");
    expect(doc.content.summary).toBe("");
  });

  it("repairs missing arrays and rejects an unknown template", () => {
    const doc = toDocument({ schemaVersion: 2, content: { personalInfo: { name: "A" } }, design: { template: "hacked", fontLevel: 99 } });
    expect(doc.content.experience).toEqual([]);
    expect(doc.content.skills).toEqual([]);
    expect(doc.design.template).toBe(DEFAULT_DESIGN.template);
    expect(doc.design.fontLevel).toBe(10);
  });

  it("round-trips a v2 document unchanged", () => {
    const doc = applyDocumentOp(emptyDocument(), "update_personal_info", { name: "Dana", title: "PM" });
    expect(toDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
  });
});

describe("applyDocumentOp", () => {
  it("routes set_design into the document's design", () => {
    const doc = emptyDocument();
    const out = applyDocumentOp(doc, "set_design", { template: "ivy-league", accentColor: "navy" });
    expect(out.design.template).toBe("ivy-league");
    expect(out.design.accentColor).toBe("navy");
    expect(out.content).toBe(doc.content);
  });

  it("turns auto-fit off when the user picks a size by hand, but not when auto-fit itself writes it", () => {
    const doc = emptyDocument();
    expect(applyDocumentOp(doc, "set_design", { fontLevel: 7 }).design.autoFit).toBe(false);
    expect(applyDocumentOp(doc, "set_design", { fontLevel: 4, fromAutoFit: true }).design.autoFit).toBe(true);
  });

  it("returns the same reference for a design call that changes nothing", () => {
    const doc = emptyDocument();
    expect(applyDocumentOp(doc, "set_design", { template: DEFAULT_DESIGN.template })).toBe(doc);
    expect(applyDocumentOp(doc, "set_design", { template: "not-a-template" })).toBe(doc);
  });

  it("routes content tools through the reducer", () => {
    const out = applyDocumentOp(emptyDocument(), "add_experience", { company: "Acme", role: "PM" });
    expect(out.content.experience[0]).toMatchObject({ company: "Acme", role: "PM" });
  });
});

describe("completeness", () => {
  it("starts empty and fills as content lands", () => {
    const empty = completeness(emptyDocument().content);
    expect(empty.every((i) => !i.done)).toBe(true);
    const doc = applyDocumentOp(emptyDocument(), "update_personal_info", { name: "Dana", title: "PM", email: "d@x.io" });
    const done = completeness(doc.content).filter((i) => i.done).map((i) => i.key);
    expect(done).toEqual(["name", "contact"]);
  });
});

describe("pinTarget", () => {
  it("rewrites an index target to the id the model saw, so a concurrent removal can't redirect it", () => {
    let doc = applyDocumentOp(emptyDocument(), "add_experience", { company: "Acme", role: "PM" });
    doc = applyDocumentOp(doc, "add_experience", { company: "Globex", role: "Analyst" });
    const pinned = pinTarget(doc, "update_experience", { index: 1, role: "Lead Analyst" });
    expect(pinned).toEqual({ id: doc.content.experience[1].id, role: "Lead Analyst" });
    // Meanwhile the user deleted Acme. Replaying the raw index would edit
    // nothing (index 1 is gone); the pinned op still lands on Globex.
    const afterDelete = applyDocumentOp(doc, "remove_experience", { id: doc.content.experience[0].id });
    expect(applyDocumentOp(afterDelete, "update_experience", { index: 1, role: "Lead Analyst" })).toBe(afterDelete);
    const out = applyDocumentOp(afterDelete, "update_experience", pinned);
    expect(out.content.experience[0]).toMatchObject({ company: "Globex", role: "Lead Analyst" });
  });

  it("leaves add tools, id-addressed calls and bad indices alone", () => {
    const doc = applyDocumentOp(emptyDocument(), "add_experience", { company: "Acme", role: "PM" });
    expect(pinTarget(doc, "add_experience", { company: "X" })).toEqual({ company: "X" });
    expect(pinTarget(doc, "update_experience", { id: "abc", role: "X" })).toEqual({ id: "abc", role: "X" });
    expect(pinTarget(doc, "update_experience", { index: 9, role: "X" })).toEqual({ index: 9, role: "X" });
  });
});

describe("insert_entry", () => {
  it("inserts a blank entry the editor can fill in", () => {
    const out = applyDocumentOp(emptyDocument(), "insert_entry", { section: "experience", entry: { id: "exp_abc123" } });
    expect(out.content.experience).toEqual([
      { id: "exp_abc123", company: "", role: "", location: "", startDate: "", endDate: "", current: false, description: [] },
    ]);
  });

  it("undoes a delete at the original position, and is idempotent", () => {
    let doc = applyDocumentOp(emptyDocument(), "add_experience", { company: "A", role: "1" });
    doc = applyDocumentOp(doc, "add_experience", { company: "B", role: "2" });
    doc = applyDocumentOp(doc, "add_experience", { company: "C", role: "3" });
    const removed = doc.content.experience[1];
    const afterDelete = applyDocumentOp(doc, "remove_experience", { id: removed.id });
    const undone = applyDocumentOp(afterDelete, "insert_entry", { section: "experience", index: 1, entry: removed });
    expect(undone.content.experience.map((e) => e.company)).toEqual(["A", "B", "C"]);
    expect(applyDocumentOp(undone, "insert_entry", { section: "experience", index: 1, entry: removed })).toBe(undone);
  });

  it("strips unknown fields and rejects bad sections or ids", () => {
    const out = applyDocumentOp(emptyDocument(), "insert_entry", { section: "certifications", entry: { id: "cert_12345", name: "PMP", evil: "<script>" } });
    expect(out.content.certifications[0]).toEqual({ id: "cert_12345", name: "PMP", issuer: "", date: "" });
    const doc = emptyDocument();
    expect(applyDocumentOp(doc, "insert_entry", { section: "skills", entry: { id: "skill_123" } })).toBe(doc);
    expect(applyDocumentOp(doc, "insert_entry", { section: "experience", entry: { id: "x" } })).toBe(doc);
  });
});

import { describe, expect, it } from "vitest";
import { applyCvToolCall, CV_TOOLS, describeToolCall } from "./cvTools";
import { emptyContent } from "@/lib/resume/document";
import type { ResumeData } from "@/types/resume";

function seeded(): ResumeData {
  let d = emptyContent();
  d = applyCvToolCall(d, "add_experience", { company: "Acme", role: "PM", description: ["Shipped onboarding"] });
  d = applyCvToolCall(d, "add_experience", { company: "Globex", role: "Analyst", description: ["Built dashboards"] });
  d = applyCvToolCall(d, "add_certification", { name: "PMP", issuer: "PMI" });
  d = applyCvToolCall(d, "add_custom_section", { title: "Volunteering", items: ["Mentor", "Tutor"] });
  return d;
}

describe("applyCvToolCall — targeting", () => {
  it("targets an entry by id even after an earlier entry is removed", () => {
    const d = seeded();
    const globexId = d.experience[1].id;
    // A concurrent remove of index 0 shifts Globex to index 0. An index-based
    // edit for "the second role" would now miss; an id-based edit cannot.
    const afterRemove = applyCvToolCall(d, "remove_experience", { index: 0 });
    const edited = applyCvToolCall(afterRemove, "update_experience", { id: globexId, role: "Senior Analyst" });
    expect(edited.experience).toHaveLength(1);
    expect(edited.experience[0].company).toBe("Globex");
    expect(edited.experience[0].role).toBe("Senior Analyst");
  });

  it("is a no-op for an unknown id (never falls back to index 0)", () => {
    const d = seeded();
    const out = applyCvToolCall(d, "update_experience", { id: "nope", index: 0, role: "X" });
    expect(out).toBe(d);
  });

  it("still accepts the model's zero-based index", () => {
    const d = seeded();
    const out = applyCvToolCall(d, "update_experience", { index: 1, role: "Lead" });
    expect(out.experience[1].role).toBe("Lead");
  });

  it("returns the same reference for an update with nothing to change", () => {
    const d = seeded();
    expect(applyCvToolCall(d, "update_experience", { index: 0 })).toBe(d);
    expect(applyCvToolCall(d, "update_education", { index: 0 })).toBe(d);
    expect(applyCvToolCall(d, "update_certification", { index: 0 })).toBe(d);
    expect(applyCvToolCall(d, "update_custom_section", { index: 0 })).toBe(d);
  });
});

describe("applyCvToolCall — new operations", () => {
  it("updates a certification", () => {
    const d = seeded();
    const out = applyCvToolCall(d, "update_certification", { id: d.certifications[0].id, date: "2024" });
    expect(out.certifications[0]).toMatchObject({ name: "PMP", issuer: "PMI", date: "2024" });
  });

  it("updates a custom section and keeps item ids for unchanged positions", () => {
    const d = seeded();
    const sec = d.customSections[0];
    const out = applyCvToolCall(d, "update_custom_section", { id: sec.id, items: ["Mentor, 3 years", "Tutor", "Coach"] });
    const items = out.customSections[0].items;
    expect(items.map((i) => i.text)).toEqual(["Mentor, 3 years", "Tutor", "Coach"]);
    expect(items[0].id).toBe(sec.items[0].id);
    expect(items[1].id).toBe(sec.items[1].id);
    expect(items[2].id).toBeTruthy();
  });

  it("moves an entry up and down by id, and no-ops at the edges", () => {
    const d = seeded();
    const [a, b] = d.experience;
    const up = applyCvToolCall(d, "move_entry", { section: "experience", id: b.id, direction: "up" });
    expect(up.experience.map((e) => e.id)).toEqual([b.id, a.id]);
    expect(applyCvToolCall(up, "move_entry", { section: "experience", id: b.id, direction: "up" })).toBe(up);
    expect(applyCvToolCall(d, "move_entry", { section: "nope", id: b.id, direction: "up" })).toBe(d);
  });

  it("exposes update tools to the model but keeps move_entry editor-only", () => {
    const names = CV_TOOLS.map((t) => t.name);
    expect(names).toContain("update_certification");
    expect(names).toContain("update_custom_section");
    expect(names).not.toContain("move_entry");
    expect(describeToolCall("move_entry", {})).toBe("Reordered");
  });
});

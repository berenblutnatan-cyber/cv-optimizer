import { describe, expect, it } from "vitest";
import { applyCvToolCall } from "@/lib/chat/cvTools";
import { emptyContent, normalizeContent } from "./document";
import { isPhotoDataUrl, squareCrop } from "./photo";
import { toPlainText } from "./plainText";
import { moveSection, sectionKeys } from "./sectionOrder";
import { toTemplateData } from "./view";

// Before this, every template laid sections out in one fixed order and custom
// sections could only sit last. The order now lives in the CV and every
// renderer follows it.

const cv = () => ({
  ...emptyContent(),
  personalInfo: { ...emptyContent().personalInfo, name: "Dana Levi" },
  experience: [{ id: "e1", company: "Acme", role: "PM", location: "", startDate: "2022", endDate: "", current: true, description: ["Led onboarding"] }],
  education: [{ id: "d1", institution: "TAU", degree: "B.Sc.", field: "", location: "", startDate: "2016", endDate: "2019", achievements: [] }],
  customSections: [
    { id: "cus_army", title: "Military service", items: [{ id: "i1", text: "Officer, 8200" }] },
    { id: "cus_vol", title: "Volunteering", items: [{ id: "i2", text: "Mentor" }] },
  ],
});

describe("section order", () => {
  it("defaults to built-ins, then custom sections", () => {
    expect(sectionKeys(cv())).toEqual(["experience", "education", "projects", "certifications", "cus_army", "cus_vol"]);
  });

  it("puts a custom section anywhere, and the templates follow", () => {
    const c = applyCvToolCall(cv(), "set_section_order", { order: ["cus_army", "education", "experience"] });
    expect(sectionKeys(c).slice(0, 3)).toEqual(["cus_army", "education", "experience"]);
    expect(toTemplateData(c).sections.map((s) => s.id)).toEqual(["cus_army", "education", "experience", "cus_vol"]);
  });

  it("orders plain-text export the same way", () => {
    const c = applyCvToolCall(cv(), "set_section_order", { order: ["cus_vol", "experience"] });
    const text = toPlainText(c);
    expect(text.indexOf("VOLUNTEERING")).toBeLessThan(text.indexOf("EXPERIENCE"));
    expect(text.indexOf("EXPERIENCE")).toBeLessThan(text.indexOf("EDUCATION"));
  });

  it("moves one step, and not past the ends", () => {
    expect(moveSection(cv(), "cus_army", "up").indexOf("cus_army")).toBe(3);
    expect(moveSection(cv(), "experience", "up")[0]).toBe("experience");
  });

  it("ignores unknown keys and keeps a deleted section's place for undo", () => {
    let c = applyCvToolCall(cv(), "set_section_order", { order: ["ghost", "cus_vol", "experience"] });
    expect(sectionKeys(c)[0]).toBe("cus_vol");
    c = applyCvToolCall(c, "remove_custom_section", { id: "cus_vol" });
    expect(sectionKeys(c)).not.toContain("cus_vol");
    expect(c.sectionOrder).toContain("cus_vol");
  });

  it("is a no-op when nothing moves", () => {
    const c = cv();
    expect(applyCvToolCall(c, "set_section_order", { order: sectionKeys(c) })).toBe(c);
  });

  it("survives storage", () => {
    const c = applyCvToolCall(cv(), "set_section_order", { order: ["education"] });
    expect(sectionKeys(normalizeContent(JSON.parse(JSON.stringify(c))))[0]).toBe("education");
  });
});

describe("empty custom sections", () => {
  it("stay off the CV until they have an item", () => {
    const c = { ...cv(), customSections: [{ id: "cus_new", title: "Awards", items: [{ id: "x", text: "  " }] }] };
    expect(toTemplateData(c).sections.map((s) => s.id)).not.toContain("cus_new");
  });
});

describe("photo", () => {
  const tiny = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

  it("keeps an inline image and removes it on empty", () => {
    const withPhoto = applyCvToolCall(cv(), "update_personal_info", { photo: tiny });
    expect(withPhoto.personalInfo.photo).toBe(tiny);
    expect(toTemplateData(withPhoto).photo).toBe(tiny);
    const without = applyCvToolCall(withPhoto, "update_personal_info", { photo: "" });
    expect(without.personalInfo.photo).toBeUndefined();
  });

  it("refuses anything that would load from elsewhere, or is too big", () => {
    for (const bad of ["https://tracker.example/p.jpg", "data:text/html;base64,PHNjcmlwdD4=", `data:image/jpeg;base64,${"A".repeat(30_000)}`]) {
      expect(isPhotoDataUrl(bad)).toBe(false);
      expect(applyCvToolCall(cv(), "update_personal_info", { photo: bad }).personalInfo.photo).toBeUndefined();
    }
  });

  it("crops a portrait from near the top, so the head stays in", () => {
    expect(squareCrop(600, 800)).toEqual({ sx: 0, sy: 40, side: 600 });
    expect(squareCrop(800, 600)).toEqual({ sx: 100, sy: 0, side: 600 });
  });
});

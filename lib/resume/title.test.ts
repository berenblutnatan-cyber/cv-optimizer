import { describe, expect, it } from "vitest";
import { documentTitle, emptyDocument, storedTitle } from "./document";

// An unnamed CV must not store an English placeholder as its title: the list,
// jobs and editor show their own "Untitled CV" in the reader's language.
describe("CV titles", () => {
  it("is empty for a CV with no name or headline", () => {
    expect(documentTitle(emptyDocument())).toBe("");
  });

  it("joins name and headline when both exist", () => {
    const doc = emptyDocument();
    doc.content.personalInfo.name = "Noa Barak";
    doc.content.personalInfo.title = "Product Manager";
    expect(documentTitle(doc)).toBe("Noa Barak — Product Manager");
  });

  it("reads the old stored English placeholder as untitled", () => {
    expect(storedTitle("Untitled CV")).toBe("");
    expect(storedTitle(null)).toBe("");
    expect(storedTitle("Noa Barak")).toBe("Noa Barak");
  });
});

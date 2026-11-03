import { describe, expect, it } from "vitest";
import { emptyDocument } from "./document";
import { toTemplateData } from "./view";

// An empty CV once showed "Your Name" in English on Hebrew pages: the
// placeholder is UI text, so the caller supplies it in the reader's language.
describe("toTemplateData placeholder name", () => {
  const content = emptyDocument().content;

  it("uses the caller's placeholder for a CV with no name", () => {
    expect(toTemplateData(content, { placeholderName: "השם שלך" }).name).toBe("השם שלך");
  });

  it("never replaces a real name", () => {
    const named = { ...content, personalInfo: { ...content.personalInfo, name: "Alex Morgan" } };
    expect(toTemplateData(named, { placeholderName: "השם שלך" }).name).toBe("Alex Morgan");
  });
});

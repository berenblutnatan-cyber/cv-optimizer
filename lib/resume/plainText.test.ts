import { describe, expect, it } from "vitest";
import { toPlainText } from "./plainText";
import { applyDocumentOp, emptyDocument } from "./document";

describe("toPlainText", () => {
  it("writes clean sections and skips empty ones", () => {
    let d = emptyDocument();
    d = applyDocumentOp(d, "update_personal_info", { name: "Dana Levi", title: "PM", email: "d@x.io", location: "Tel Aviv" });
    d = applyDocumentOp(d, "add_experience", { company: "Acme", role: "PM", startDate: "2021", current: true, description: ["Rebuilt onboarding", ""] });
    d = applyDocumentOp(d, "set_skills", { skills: ["SQL", "Figma"] });
    expect(toPlainText(d.content)).toBe(
      ["Dana Levi", "PM", "d@x.io | Tel Aviv", "", "EXPERIENCE", "PM, Acme", "2021 - Present", "- Rebuilt onboarding", "", "SKILLS", "SQL, Figma", ""].join("\n"),
    );
  });

  it("returns just a newline for an empty CV", () => {
    expect(toPlainText(emptyDocument().content)).toBe("\n");
  });
});

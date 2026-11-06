import { describe, expect, it } from "vitest";
import type { DeepAudit } from "@/lib/optimizer/types";
import { emptyDocument } from "@/lib/resume/document";
import { toReadout } from "./view";

const content = {
  ...emptyDocument().content,
  experience: [
    { id: "e1", company: "PayLeaf", role: "Senior Analyst", location: "", startDate: "2022", endDate: "", current: true, description: ["Built the A/B platform"] },
  ],
};

const audit: DeepAudit = {
  originalScore: { total: 68, breakdown: { ats: 70, impact: 60, clarity: 74 } },
  summary: "Solid analyst CV, light on scale.",
  strengths: ["Clear numbers in the first role", " "],
  improvements: [
    { id: "a", text: "Lead with the experiment platform", scoreImpact: 4, category: "impact" },
    { id: "b", text: "Add dbt to skills", scoreImpact: 9, category: "ats" },
  ],
  missingKeySkills: ["Looker"],
  jdRequirements: [
    { id: "req_1", text: "Looker dashboards", kind: "nice_to_have", category: "skill" },
    { id: "req_2", text: "A/B testing at scale", kind: "must_have", category: "experience" },
    { id: "req_3", text: "SQL", kind: "must_have", category: "skill" },
  ],
  coverage: [
    { requirementId: "req_2", status: "strong", evidence: [{ quote: "Built the A/B platform", section: "experience", index: 0 }], gapSeverity: null, note: "" },
    { requirementId: "req_3", status: "missing", evidence: [], gapSeverity: "critical", note: "SQL isn't named." },
  ],
  sectionCritiques: [
    { section: "skills", verdict: "Thin.", issues: ["No tools listed"] },
    { section: "experience", experienceIndex: 0, verdict: "Strong role.", issues: [] },
    { section: "overall", verdict: "Good base.", issues: [] },
  ],
};

describe("the review readout", () => {
  const r = toReadout(audit, content, { title: "Senior Data Analyst" });

  it("puts must-haves first, and gaps before what's covered", () => {
    expect(r.requirements.map((x) => x.text)).toEqual(["SQL", "A/B testing at scale", "Looker dashboards"]);
    expect(r.requirements[0].status).toBe("missing");
    // A requirement the audit never covered reads as missing, not as fine.
    expect(r.requirements[2].status).toBe("missing");
  });

  it("quotes the CV for what it covers", () => {
    expect(r.requirements[1].quote).toBe("Built the A/B platform");
  });

  it("names the role a critique is about and orders sections like the CV", () => {
    expect(r.sections.map((s) => s.key)).toEqual(["overall", "experience", "skills"]);
    expect(r.sections[1].entry).toBe("Senior Analyst · PayLeaf");
  });

  it("ranks fixes by impact, drops blank strengths, and records what it read against", () => {
    expect(r.fixes[0].text).toBe("Add dbt to skills");
    expect(r.strengths).toEqual(["Clear numbers in the first role"]);
    expect(r).toMatchObject({ targetTitle: "Senior Data Analyst", readAgainstJob: false, verdict: "apply_with_cover_letter" });
  });
});

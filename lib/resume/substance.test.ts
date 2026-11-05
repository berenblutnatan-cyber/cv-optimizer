import { describe, expect, it } from "vitest";
import type { ResumeData } from "@/types/resume";
import { completeness, emptyDocument } from "./document";
import { toTemplateData } from "./view";
import { computeLocalScore } from "@/lib/optimizer/localChecks";
import { isEmail, isPhone } from "./substance";

// A blank entry ("Add role", "Add school") once counted as content: the
// checklist ticked it, the free score paid for it, and paid runs let a CV with
// no experience through. These pin "content means words", everywhere.

const blank = (): ResumeData => emptyDocument().content;

const withBlankEntries = (): ResumeData => ({
  ...blank(),
  experience: [{ id: "exp_blank1", company: "", role: "", location: "", startDate: "", endDate: "", current: false, description: ["", "  "] }],
  education: [{ id: "edu_blank1", institution: "", degree: "", field: "", location: "", startDate: "", endDate: "", achievements: [] }],
  skills: ["", " "],
});

const weak = (): ResumeData => ({
  ...blank(),
  personalInfo: { ...blank().personalInfo, name: "Dana Levi", title: "Marketing manager", email: "dana@example.com" },
  experience: [{ id: "exp_weak01", company: "Acme", role: "Marketer", location: "", startDate: "2020", endDate: "", current: true, description: ["Responsible for social media", "Helped with campaigns"] }],
  skills: ["Excel"],
});

const strong = (): ResumeData => ({
  ...blank(),
  personalInfo: { ...blank().personalInfo, name: "Dana Levi", title: "Marketing manager", email: "dana@example.com", phone: "+972 50 123 4567", location: "Tel Aviv" },
  summary: "Growth marketer with seven years in B2B SaaS, owning paid, lifecycle and content programs end to end.",
  experience: [
    {
      id: "exp_strong1",
      company: "Acme",
      role: "Marketing manager",
      location: "Tel Aviv",
      startDate: "2020",
      endDate: "",
      current: true,
      description: [
        "Grew qualified pipeline 48% in a year by rebuilding paid search around intent keywords",
        "Cut cost per lead from $92 to $41 across 3 channels",
        "Launched a lifecycle program that lifted trial-to-paid conversion by 11 points",
        "Built a 4-person content team that ships 12 articles a month",
      ],
    },
    {
      id: "exp_strong2",
      company: "Globex",
      role: "Marketing specialist",
      location: "Tel Aviv",
      startDate: "2017",
      endDate: "2020",
      current: false,
      description: ["Owned a $1.2M paid budget across Google and LinkedIn", "Designed 20 A/B tests that raised landing conversion 30%"],
    },
  ],
  education: [{ id: "edu_strong1", institution: "Tel Aviv University", degree: "BA", field: "Economics", location: "", startDate: "2013", endDate: "2016", achievements: [] }],
  skills: ["Google Ads", "LinkedIn Ads", "HubSpot", "SQL", "Looker", "A/B testing", "Copywriting", "SEO"],
});

const done = (c: ResumeData) => Object.fromEntries(completeness(c).map((i) => [i.key, i.done]));

describe("completeness counts words, not slots", () => {
  it("leaves blank entries unticked", () => {
    const d = done(withBlankEntries());
    expect(d.experience).toBe(false);
    expect(d.education).toBe(false);
    expect(d.skills).toBe(false);
  });

  it("ticks a filled role and school", () => {
    const c = weak();
    c.education = [{ ...withBlankEntries().education[0], institution: "Tel Aviv University" }];
    expect(done(c).experience).toBe(true);
    expect(done(c).education).toBe(true);
  });

  it("needs a contact that can actually reach you", () => {
    const c = blank();
    for (const email of ["dana", "dana@gmail", "dana gmail.com", "@x.com"]) {
      expect(done({ ...c, personalInfo: { ...c.personalInfo, email } }).contact).toBe(false);
    }
    expect(done({ ...c, personalInfo: { ...c.personalInfo, phone: "12" } }).contact).toBe(false);
    expect(done({ ...c, personalInfo: { ...c.personalInfo, email: "dana@gmail.com" } }).contact).toBe(true);
    expect(done({ ...c, personalInfo: { ...c.personalInfo, phone: "050-123-4567" } }).contact).toBe(true);
  });
});

describe("contact formats", () => {
  it.each(["a@b.co", "dana.levi+cv@mail.example.org", " dana@gmail.com "])("email %s is valid", (s) => expect(isEmail(s)).toBe(true));
  it.each(["", "dana", "dana@", "dana@gmail", "dana@gmail.", "da na@gmail.com"])("email %s is not", (s) => expect(isEmail(s)).toBe(false));
  it.each(["+972 50 123 4567", "050-123-4567", "(212) 555-0199"])("phone %s is valid", (s) => expect(isPhone(s)).toBe(true));
  it.each(["", "123", "call me", "050-12a-4567"])("phone %s is not", (s) => expect(isPhone(s)).toBe(false));
});

describe("the free score tells empty, weak and strong apart", () => {
  const score = (c: ResumeData) => computeLocalScore(c).overall;

  it("gives an empty CV almost nothing", () => {
    expect(score(blank())).toBeLessThanOrEqual(10);
  });

  it("gives blank entries nothing extra", () => {
    expect(score(withBlankEntries())).toBe(score(blank()));
  });

  it("ranks empty < weak < strong with clear gaps", () => {
    const [e, w, s] = [score(blank()), score(weak()), score(strong())];
    expect(w - e).toBeGreaterThanOrEqual(25);
    expect(s - w).toBeGreaterThanOrEqual(20);
    expect(s).toBeGreaterThanOrEqual(80);
  });

  it("never calls an empty CV clear or readable", () => {
    const cats = Object.fromEntries(computeLocalScore(blank()).categories.map((c) => [c.category, c.score]));
    expect(cats.clarity).toBe(0);
    expect(cats.impact).toBe(0);
    expect(cats.ats).toBe(0);
  });
});

describe("the preview skips blank entries", () => {
  it("shows no empty Experience or Education heading", () => {
    const ids = toTemplateData(withBlankEntries()).sections.map((s) => s.id);
    expect(ids).not.toContain("experience");
    expect(ids).not.toContain("education");
  });

  it("drops the blank entry but keeps the filled one", () => {
    const c = weak();
    c.experience = [...c.experience, withBlankEntries().experience[0]];
    const exp = toTemplateData(c).sections.find((s) => s.id === "experience");
    expect(exp?.items.map((i) => i.id)).toEqual(["exp_weak01"]);
  });
});

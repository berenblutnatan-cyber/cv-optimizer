// Unit eval for the bullet-level edit primitives and the Advice target
// resolver — the two things that make "cut this bullet" both expressible and
// SAFE. Fully offline (pure reducers, no I/O, no LLM).
//
// Fails on the OLD tree: rewrite_bullet/remove_bullet/insert_bullet did not
// exist, so applyCvToolCall fell through to `default: return data` and every
// bullet-edit assertion below fails.
//
// Run: npx tsx scripts/review-primitives-eval.ts   (npm run eval:review-primitives)

import { applyCvToolCall, getEntryBullets, normalizeBulletSection } from "@/lib/chat/cvTools";
import { hashText, resolveRef, buildToolCall, isStale, makeBulletRef } from "@/lib/review/targetRef";
import type { Advice } from "@/lib/review/types";
import type { ResumeData } from "@/types/resume";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`${GREEN}✓${RESET} ${name}`);
  } else {
    failures++;
    console.log(`${RED}✗ ${name}${RESET}${detail ? `  — ${detail}` : ""}`);
  }
}

const CV: ResumeData = {
  personalInfo: {
    name: "Dana Levi", email: "dana@example.com", phone: "+972 50 000 0000",
    linkedin: "linkedin.com/in/danalevi", website: "", location: "Tel Aviv", title: "Product Analyst",
  },
  summary: "Product analyst with six years turning messy funnels into decisions.",
  experience: [
    {
      id: "exp-1", company: "Northwind", role: "Senior Product Analyst", location: "Tel Aviv",
      startDate: "2021", endDate: "Present", current: true,
      description: [
        "Drove a 22% lift in activation by rebuilding the onboarding funnel",
        "Responsible for various reporting duties",
        "Built the experimentation review that now gates every launch",
      ],
    },
    {
      id: "exp-2", company: "Kettle", role: "Analyst", location: "Haifa",
      startDate: "2018", endDate: "2021", current: false,
      description: ["Helped with dashboards", "Worked on data quality"],
    },
  ],
  education: [
    {
      id: "edu-1", institution: "Technion", degree: "BSc", field: "Industrial Engineering",
      location: "Haifa", startDate: "2014", endDate: "2018", gpa: "88",
      achievements: ["Dean's List 2017", "Teaching assistant, Statistics"],
    },
  ],
  skills: ["SQL", "Python", "Amplitude"],
  projects: [
    { id: "prj-1", name: "Churn radar", description: "Early-warning model", technologies: ["Python"], bullets: ["Cut false positives by half"] },
  ],
  certifications: [],
  languages: ["Hebrew", "English"],
  customSections: [
    { id: "cs-1", title: "Volunteering", items: [{ id: "it-1", text: "Mentor at Baot" }, { id: "it-2", text: "Ran a data clinic" }] },
  ],
};

// ── 1. section alias normalization ──────────────────────────────────────────
check("normalize 'custom' -> customSections", normalizeBulletSection("custom") === "customSections");
check("normalize 'Experience' -> experience", normalizeBulletSection("Experience") === "experience");
check("normalize garbage -> null", normalizeBulletSection("nonsense") === null);

// ── 2. remove_bullet ────────────────────────────────────────────────────────
const afterCut = applyCvToolCall(CV, "remove_bullet", { section: "experience", index: 0, bulletIndex: 1 });
check("remove_bullet drops exactly one line", afterCut.experience[0].description.length === 2);
check(
  "remove_bullet drops the RIGHT line",
  !afterCut.experience[0].description.some((b) => b.startsWith("Responsible for various")),
);
check("remove_bullet leaves sibling entry untouched", afterCut.experience[1].description.length === 2);

// ── 3. out-of-range is a no-op returning the SAME reference ─────────────────
// (identity matters: it's what stops the preview and autosave from churning)
check(
  "out-of-range bulletIndex -> same reference",
  applyCvToolCall(CV, "remove_bullet", { section: "experience", index: 0, bulletIndex: 99 }) === CV,
);
check(
  "out-of-range entry index -> same reference",
  applyCvToolCall(CV, "remove_bullet", { section: "experience", index: 42, bulletIndex: 0 }) === CV,
);
check(
  "unknown section -> same reference",
  applyCvToolCall(CV, "remove_bullet", { section: "nope", index: 0, bulletIndex: 0 }) === CV,
);
check(
  "negative bulletIndex -> same reference",
  applyCvToolCall(CV, "remove_bullet", { section: "experience", index: 0, bulletIndex: -1 }) === CV,
);

// ── 4. rewrite_bullet ───────────────────────────────────────────────────────
const rewritten = applyCvToolCall(CV, "rewrite_bullet", {
  section: "experience", index: 1, bulletIndex: 0, text: "Rebuilt 12 exec dashboards, cutting reporting time 60%",
});
check("rewrite_bullet replaces the target", rewritten.experience[1].description[0].startsWith("Rebuilt 12 exec"));
check("rewrite_bullet preserves list length", rewritten.experience[1].description.length === 2);
check(
  "rewrite_bullet with empty text -> no-op (can't blank a line)",
  applyCvToolCall(CV, "rewrite_bullet", { section: "experience", index: 0, bulletIndex: 0, text: "   " }) === CV,
);
check(
  "rewrite_bullet to identical text -> same reference",
  applyCvToolCall(CV, "rewrite_bullet", {
    section: "experience", index: 0, bulletIndex: 0, text: CV.experience[0].description[0],
  }) === CV,
);

// ── 5. all four sections are addressable ────────────────────────────────────
const eduCut = applyCvToolCall(CV, "remove_bullet", { section: "education", index: 0, bulletIndex: 0 });
check("education achievements are addressable", eduCut.education[0].achievements.length === 1);
const prjCut = applyCvToolCall(CV, "remove_bullet", { section: "projects", index: 0, bulletIndex: 0 });
check("project bullets are addressable", prjCut.projects[0].bullets.length === 0);
const csRw = applyCvToolCall(CV, "rewrite_bullet", { section: "custom", index: 0, bulletIndex: 1, text: "Ran a monthly data clinic" });
check("custom section items are addressable", csRw.customSections[0].items[1].text === "Ran a monthly data clinic");
check("custom section rewrite PRESERVES item id", csRw.customSections[0].items[1].id === "it-2");

// ── 6. insert_bullet ────────────────────────────────────────────────────────
const appended = applyCvToolCall(CV, "insert_bullet", { section: "experience", index: 1, text: "Owned the weekly metrics review" });
check("insert_bullet appends by default", appended.experience[1].description.length === 3 &&
  appended.experience[1].description[2] === "Owned the weekly metrics review");
const inserted = applyCvToolCall(CV, "insert_bullet", { section: "experience", index: 1, text: "First line", atIndex: 0 });
check("insert_bullet honors atIndex", inserted.experience[1].description[0] === "First line");

// ── 7. immutability: the original is never mutated ──────────────────────────
check("original CV unmutated after all ops", CV.experience[0].description.length === 3 &&
  CV.customSections[0].items[1].text === "Ran a data clinic");

// ── 8. getEntryBullets agrees with the reducer ──────────────────────────────
check("getEntryBullets reads custom items as text", getEntryBullets(CV, "customSections", 0)?.[0] === "Mentor at Baot");
check("getEntryBullets out-of-range -> null", getEntryBullets(CV, "experience", 9) === null);

// ── 9. hashText is stable and whitespace-insensitive ────────────────────────
check("hashText stable", hashText("Led the migration") === hashText("Led the migration"));
check("hashText normalizes whitespace", hashText(" Led   the migration ") === hashText("Led the migration"));
check("hashText distinguishes different text", hashText("Led the migration") !== hashText("Led the migrations"));

// ── 10. THE SAFETY GUARD: stale refs never resolve to the wrong line ────────
const ref = makeBulletRef(CV, "experience", 0, 1)!;
check("makeBulletRef captures entryId", ref.entryId === "exp-1");
check("fresh ref resolves", resolveRef(CV, ref)?.text.startsWith("Responsible for various") === true);

// user edited that exact line since the review ran
const edited: ResumeData = {
  ...CV,
  experience: CV.experience.map((e, i) =>
    i === 0 ? { ...e, description: ["Drove a 22% lift in activation by rebuilding the onboarding funnel", "TOTALLY DIFFERENT LINE", "Built the experimentation review that now gates every launch"] } : e
  ),
};
check("edited target -> resolveRef returns null (stale)", resolveRef(edited, ref) === null);

// user deleted an EARLIER bullet, shifting indices — must re-locate by hash
const shifted: ResumeData = {
  ...CV,
  experience: CV.experience.map((e, i) =>
    i === 0 ? { ...e, description: e.description.slice(1) } : e
  ),
};
const reloc = resolveRef(shifted, ref);
check("shifted target -> re-located by hash", reloc !== null && reloc.bulletIndex === 0 && reloc.moved === true,
  reloc ? `bulletIndex=${reloc.bulletIndex}` : "null");

// user reordered entries — entryId must win over entryIndex
const reordered: ResumeData = { ...CV, experience: [CV.experience[1], CV.experience[0]] };
const rr = resolveRef(reordered, ref);
check("reordered entries -> found via entryId", rr !== null && rr.entryIndex === 1, rr ? `entryIndex=${rr.entryIndex}` : "null");

// ── 11. buildToolCall derives from FRESH indices, not stored ones ───────────
const cutAdvice: Advice = {
  id: "ai:bullet:0.1", source: "ai", target: ref, verdict: "cut",
  title: "Cut filler bullet", reason: "Says nothing a recruiter can act on", scoreImpact: 4,
};
const callFresh = buildToolCall(CV, cutAdvice);
check("buildToolCall on fresh CV targets index 1", callFresh?.name === "remove_bullet" && callFresh.input.bulletIndex === 1);

const callShifted = buildToolCall(shifted, cutAdvice);
check("buildToolCall after a shift re-points to index 0", callShifted?.input.bulletIndex === 0,
  JSON.stringify(callShifted?.input));

// the payoff: applying the shifted call removes the INTENDED line, not a neighbour
const applied = applyCvToolCall(shifted, callShifted!.name, callShifted!.input);
check("applying shifted call cuts the intended line",
  !applied.experience[0].description.some((b) => b.startsWith("Responsible for various")) &&
  applied.experience[0].description.length === 1);

check("buildToolCall on stale advice -> null", buildToolCall(edited, cutAdvice) === null);
check("isStale detects the edited target", isStale(edited, cutAdvice) === true);
check("isStale false on fresh target", isStale(CV, cutAdvice) === false);

// ── 12. rewrite advice must carry replacement text ─────────────────────────
const rwNoAfter: Advice = { ...cutAdvice, id: "x", verdict: "rewrite", after: undefined };
check("rewrite advice without `after` -> null (never blanks a line)", buildToolCall(CV, rwNoAfter) === null);
const rwOk: Advice = { ...cutAdvice, id: "y", verdict: "rewrite", after: "Owned funnel reporting end to end, cutting turnaround 60%" };
const rwCall = buildToolCall(CV, rwOk);
check("rewrite advice builds rewrite_bullet", rwCall?.name === "rewrite_bullet" && rwCall.input.text === rwOk.after);

// ── 13. "keep" is never actionable ─────────────────────────────────────────
check("keep verdict -> no tool call", buildToolCall(CV, { ...cutAdvice, id: "z", verdict: "keep" }) === null);

// ── 14. deterministic local fixes pass straight through ────────────────────
const localAdvice: Advice = {
  id: "local:skills", source: "local", target: { kind: "skills" }, verdict: "rewrite",
  title: "Add skills", reason: "ATS needs them", scoreImpact: 6,
  fix: { kind: "deterministic", tool: "set_skills", input: { skills: ["SQL", "Python", "dbt"] } },
};
const localCall = buildToolCall(CV, localAdvice);
check("deterministic fix passes through unchanged", localCall?.name === "set_skills");
check("AI-kind fix is not auto-applicable", buildToolCall(CV, {
  ...localAdvice, id: "local:ai", fix: { kind: "ai", instruction: "rewrite the summary" },
}) === null);

console.log(
  failures === 0
    ? `\n${GREEN}All review-primitive assertions passed.${RESET}`
    : `\n${RED}${failures} assertion(s) failed.${RESET}`
);
process.exit(failures === 0 ? 0 : 1);

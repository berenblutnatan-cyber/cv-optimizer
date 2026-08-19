// Offline, deterministic eval for the knowledge layer. Zero API cost — run
// on every commit that touches lib/knowledge/.
//
// Run: npx tsx scripts/knowledge-eval.ts   (npm run eval:knowledge)

import { knowledgeFor, detectTrack, seniorityFromExperience, applyVerdict } from "@/lib/knowledge";
import type { Goal, Seniority, Surface, Track } from "@/lib/knowledge";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`\x1b[32m✓\x1b[0m ${name}`);
  } else {
    failures++;
    console.log(`\x1b[31m✗ ${name}${detail ? ` — ${detail}` : ""}\x1b[0m`);
  }
}

// ── 1. Track detection: the full 37-role onboarding taxonomy ────────────────
const TRACK_TABLE: Array<[string, Track]> = [
  // tech
  ["Software Engineer", "tech"],
  ["Frontend Developer", "tech"],
  ["Backend Developer", "tech"],
  ["Full-Stack Developer", "tech"],
  ["Mobile Developer", "tech"],
  ["DevOps Engineer", "tech"],
  ["QA Engineer", "tech"],
  ["Data Analyst", "tech"],
  ["Data Scientist", "tech"],
  ["Data Engineer", "tech"],
  ["Machine Learning Engineer", "tech"],
  ["Product Manager", "tech"],
  // creative
  ["UX/UI Designer", "creative"],
  ["Graphic Designer", "creative"],
  ["Content Writer", "creative"],
  // general (incl. the "engineer" trap)
  ["Project Manager", "general"],
  ["Program Manager", "general"],
  ["Business Analyst", "general"],
  ["Marketing Manager", "general"],
  ["Digital Marketing Specialist", "general"],
  ["Sales Manager", "general"],
  ["Account Executive", "general"],
  ["Customer Success Manager", "general"],
  ["HR Manager", "general"],
  ["Recruiter", "general"],
  ["Financial Analyst", "general"],
  ["Accountant", "general"],
  ["Operations Manager", "general"],
  ["Office Manager", "general"],
  ["Executive Assistant", "general"],
  ["Customer Support Specialist", "general"],
  ["Teacher", "general"],
  ["Nurse", "general"],
  ["Lawyer", "general"],
  ["Civil Engineer", "general"],
  ["Mechanical Engineer", "general"],
  ["Electrical Engineer", "general"],
];
for (const [title, expected] of TRACK_TABLE) {
  const got = detectTrack(title);
  check(`detectTrack("${title}") = ${expected}`, got === expected, `got ${got}`);
}
// Precedence + extras
check('detectTrack("VP Engineering") = executive', detectTrack("VP Engineering") === "executive");
check('detectTrack("Head of Design") = executive', detectTrack("Head of Design") === "executive");
check('detectTrack("Postdoctoral Researcher") = academic', detectTrack("Postdoctoral Researcher") === "academic");
check('detectTrack("Senior React Engineer") = tech', detectTrack("Senior React Engineer") === "tech");
check('detectTrack("") = general', detectTrack("") === "general");
check(
  "JD fallback: empty title + React JD → tech",
  detectTrack("", "We need a developer with strong React and TypeScript skills") === "tech"
);

// ── 2. Seniority buckets ────────────────────────────────────────────────────
const SENIORITY_TABLE: Array<[string | null, Seniority | null]> = [
  ["student", "entry"],
  ["1-3", "early"],
  ["3-5", "mid"],
  ["5-10", "senior"],
  ["10+", "lead"],
  ["garbage", null],
  ["", null],
  [null, null],
];
for (const [bucket, expected] of SENIORITY_TABLE) {
  const got = seniorityFromExperience(bucket);
  check(`seniorityFromExperience(${JSON.stringify(bucket)}) = ${expected}`, got === expected, `got ${got}`);
}

// ── 3. applyVerdict band edges ──────────────────────────────────────────────
const VERDICT_TABLE: Array<[number, string]> = [
  [49, "skip"],
  [50, "stretch"],
  [59, "stretch"],
  [60, "apply_with_cover_letter"],
  [74, "apply_with_cover_letter"],
  [75, "apply"],
  [89, "apply"],
  [90, "strong_apply"],
];
for (const [score, expected] of VERDICT_TABLE) {
  check(`applyVerdict(${score}) = ${expected}`, applyVerdict(score) === expected);
}

// ── 4. Composition: every cell composes, within budget, no banned stats ─────
const SURFACES: Surface[] = [
  "audit", "rewrite", "coverLetter", "interviewPrep", "coldEmail",
  "linkedin", "applicationAnswers", "references", "salaryPrep",
  "offerCompare", "caseStudy",
];
const TRACKS: Track[] = ["tech", "executive", "academic", "creative", "general"];
const SENIORITIES: Array<Seniority | null> = ["entry", "early", "mid", "senior", "lead", null];
const GOALS: Array<Goal | null> = ["ats", "recruiter", "both", null];
// ~4 chars/token; audit ≤650tok, rewrite ≤700tok, others ≤500tok, plus the
// career-change overlay allowance on writing surfaces.
const CHAR_CAPS: Record<Surface, number> = {
  audit: 3400, rewrite: 3800, coverLetter: 3200, interviewPrep: 2200,
  coldEmail: 2400, linkedin: 2600, applicationAnswers: 2200, references: 2200,
  salaryPrep: 2400, offerCompare: 2400, caseStudy: 2800,
};
// Unsourced marketing stats from the source skills — must never reach a prompt.
const BANNED = /75% of resumes|21x more views|84% of employers|30% more attention/i;

let compositionFailures = 0;
let bannedHits = 0;
let overCap = 0;
for (const surface of SURFACES) {
  for (const track of TRACKS) {
    for (const seniority of SENIORITIES) {
      for (const goal of GOALS) {
        for (const careerChange of [false, true]) {
          let out = "";
          try {
            out = knowledgeFor({ surface, track, seniority, goal, careerChange });
          } catch {
            compositionFailures++;
            continue;
          }
          if (BANNED.test(out)) bannedHits++;
          if (out.length > CHAR_CAPS[surface]) {
            overCap++;
            if (overCap === 1) console.log(`  first over-cap: ${surface}/${track}/${seniority} = ${out.length} > ${CHAR_CAPS[surface]}`);
          }
        }
      }
    }
  }
}
const totalCells = SURFACES.length * TRACKS.length * SENIORITIES.length * GOALS.length * 2;
check(`all ${totalCells} compositions return without throwing`, compositionFailures === 0, `${compositionFailures} threw`);
check("no banned marketing stat in any composition", bannedHits === 0, `${bannedHits} hits`);
check("every composition within its char cap", overCap === 0, `${overCap} over`);

// ── 5. Null-persona behavior ────────────────────────────────────────────────
const nullAudit = knowledgeFor({ surface: "audit", track: "general", seniority: null, goal: null });
const nullRewrite = knowledgeFor({ surface: "rewrite", track: "general", seniority: null, goal: null });
check("null-persona audit block is non-empty", nullAudit.length > 200);
check("null-persona rewrite block is non-empty", nullRewrite.length > 200);
check("general track adds no track formula to rewrite", !/TECH FORMULA|EXECUTIVE|ACADEMIC|CREATIVE/.test(nullRewrite));
check("executive rewrite includes the executive formula", /EXECUTIVE FORMULA/.test(knowledgeFor({ surface: "rewrite", track: "executive" })));
check("careerChange overlay appears only when flagged", !/CAREER-CHANGE/.test(nullRewrite) && /CAREER-CHANGE/.test(knowledgeFor({ surface: "rewrite", track: "tech", careerChange: true })));
check("recruiter goal drops the ATS lens from audit", !/ATS CHECKS/.test(knowledgeFor({ surface: "audit", track: "general", goal: "recruiter" })) && /ATS CHECKS/.test(knowledgeFor({ surface: "audit", track: "general", goal: "ats" })));

console.log("");
if (failures > 0) {
  console.log(`\x1b[31m${failures} assertion(s) failed.\x1b[0m`);
  process.exit(1);
}
console.log("\x1b[32mAll knowledge assertions passed.\x1b[0m");

// Unit eval for the inline-assist mapper (lib/assist/actions.ts). Pure/offline.
// Proves buildAssistInput + applyCvToolCall produce the expected ResumeData for
// each action — the array-merge / skills-dedupe logic that's easy to get wrong.
//
// Run: npx tsx scripts/assist-actions-eval.ts   (or: npm run eval:assist)

import { buildAssistInput } from "@/lib/assist/actions";
import { applyCvToolCall } from "@/lib/chat/cvTools";
import { STRONG_CV } from "@/evals/local-checks-fixtures";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";
let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`${GREEN}✓${RESET} ${name}`);
  else {
    failures++;
    console.log(`${RED}✗ ${name}${RESET}${detail ? `  — ${detail}` : ""}`);
  }
}

// improve_bullets REPLACES the role's description with the items.
{
  const built = buildAssistInput("improve_bullets", { items: ["A", "B", "C"] }, { expIndex: 0 }, STRONG_CV);
  const out = built && applyCvToolCall(STRONG_CV, built.tool, built.input);
  check(
    "improve_bullets replaces description",
    Boolean(out) && JSON.stringify(out!.experience[0].description) === JSON.stringify(["A", "B", "C"])
  );
}

// generate_bullets APPENDS to existing bullets.
{
  const before = STRONG_CV.experience[0].description.filter((b) => b.trim()).length;
  const built = buildAssistInput("generate_bullets", { items: ["New bullet"] }, { expIndex: 0 }, STRONG_CV);
  const out = built && applyCvToolCall(STRONG_CV, built.tool, built.input);
  check(
    "generate_bullets appends",
    Boolean(out) &&
      out!.experience[0].description.length === before + 1 &&
      out!.experience[0].description.at(-1) === "New bullet"
  );
}

// suggest_skills merges current + suggested; reducer dedupes.
{
  const built = buildAssistInput("suggest_skills", { items: ["SQL", "GraphQL"] }, {}, STRONG_CV);
  const out = built && applyCvToolCall(STRONG_CV, built.tool, built.input);
  const sqlCount = out ? out.skills.filter((s) => s === "SQL").length : 0;
  check("suggest_skills adds new skill", Boolean(out) && out!.skills.includes("GraphQL"));
  check("suggest_skills dedupes existing", sqlCount === 1, `SQL appeared ${sqlCount}x`);
}

// suggest_headline sets the title.
{
  const built = buildAssistInput("suggest_headline", { text: "Senior Product Analyst" }, {}, STRONG_CV);
  const out = built && applyCvToolCall(STRONG_CV, built.tool, built.input);
  check("suggest_headline sets title", Boolean(out) && out!.personalInfo.title === "Senior Product Analyst");
}

// write_summary sets the summary.
{
  const built = buildAssistInput("write_summary", { text: "New summary." }, {}, STRONG_CV);
  const out = built && applyCvToolCall(STRONG_CV, built.tool, built.input);
  check("write_summary sets summary", Boolean(out) && out!.summary === "New summary.");
}

// Out-of-range expIndex -> null (no crash, no mutation).
check("out-of-range expIndex returns null", buildAssistInput("improve_bullets", { items: ["X"] }, { expIndex: 9 }, STRONG_CV) === null);

// Empty suggestion -> null.
check("empty items returns null", buildAssistInput("improve_bullets", { items: [] }, { expIndex: 0 }, STRONG_CV) === null);

console.log(failures === 0 ? `\n${GREEN}All assist-actions assertions passed.${RESET}` : `\n${RED}${failures} failed.${RESET}`);
process.exit(failures === 0 ? 0 : 1);

// Live eval for the chat builder agent. Runs the SAME loop the routes ship
// (lib/chat/runTurn.ts, shared by /api/chat/build and /api/cv/[id]/chat) over
// a scripted 8-turn conversation and asserts on the resulting CV.
// Exit codes: 0 pass, 1 assertion failure, 2 config error.
// Run: npm run eval:chat   (needs ANTHROPIC_API_KEY)
import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";
import { CV_TOOLS, applyCvToolCall, snapshotForPrompt, describeToolCall } from "@/lib/chat/cvTools";
import { buildChatSystemPrompt, chatGreeting } from "@/lib/chat/prompts";
import { normalizeTurnHistory, runChatTurn } from "@/lib/chat/runTurn";
import { initialResumeState, type ResumeData } from "@/types/resume";

config({ path: ".env.local" });
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY missing");
  process.exit(2);
}
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const USER_TURNS = [
  "hey. I'm Dana Levi, looking for a senior product manager role",
  "right now I'm a PM at Wix, been there since 2022. I own the mobile editor, work with a team of 8 engineers",
  "hmm proudest thing... we shipped a new onboarding flow that improved activation by 23%. also led the migration to a new design system across like 5 squads",
  "before that I was a product analyst at Lightricks for 2 years. mostly dashboards and a/b tests for the photo apps",
  "BSc industrial engineering from the Technion, finished 2019",
  "skills — sql, figma, amplitude, a/b testing, roadmapping. I speak hebrew and english",
  "skip",
  "email dana.levi@gmail.com, I'm in Tel Aviv. I'm done — wrap it up",
];

async function runTurn(
  history: { role: "user" | "assistant"; content: string }[],
  resume: ResumeData,
): Promise<{ text: string; resume: ResumeData; toolLabels: string[] }> {
  let text = "";
  const toolLabels: string[] = [];
  const messages = normalizeTurnHistory(history, { maxMessages: 60, maxChars: 24_000 });
  if (!messages) throw new Error("bad history");
  await runChatTurn({
    client: anthropic,
    system: buildChatSystemPrompt(resume),
    tools: CV_TOOLS as Anthropic.Tool[],
    messages,
    emit: (e) => {
      if (e.type === "text") text += e.text;
    },
    onTool: (name, input) => {
      if (name === "set_design") return true;
      const next = applyCvToolCall(resume, name, input);
      if (next === resume) {
        toolLabels.push(`NO-OP! ${name} ${JSON.stringify(input).slice(0, 120)}`);
        return false;
      }
      toolLabels.push(describeToolCall(name, input));
      resume = next;
      return true;
    },
  });
  return { text, resume, toolLabels };
}

async function main() {
  let resume = initialResumeState;
  // Client-side transcript: greeting is seeded locally, history is text-only.
  const transcript: { role: "user" | "assistant"; content: string }[] = [
    { role: "assistant", content: chatGreeting(false) },
  ];

  for (const turn of USER_TURNS) {
    transcript.push({ role: "user", content: turn });
    // Replicate the route: drop leading assistant turns, merge same-role runs.
    const history = transcript.slice();
    while (history.length && history[0].role === "assistant") history.shift();
    const t0 = Date.now();
    const { text, resume: next, toolLabels } = await runTurn(history, resume);
    resume = next;
    console.log(`\n👤 ${turn}`);
    toolLabels.forEach((l) => console.log(`   ✦ ${l}`));
    console.log(`🤖 ${text.trim()}  [${((Date.now() - t0) / 1000).toFixed(1)}s]`);
    transcript.push({ role: "assistant", content: text.trim() || "(no text)" });
  }

  console.log("\n========== FINAL CV ==========");
  console.log(snapshotForPrompt(resume));

  const fails: string[] = [];
  if (resume.personalInfo.name !== "Dana Levi") fails.push("name");
  if (!/product manager/i.test(resume.personalInfo.title)) fails.push("title");
  if (resume.experience.length !== 2) fails.push(`experience count = ${resume.experience.length}`);
  if (resume.education.length !== 1) fails.push("education");
  if (resume.skills.length < 5) fails.push("skills");
  if (!resume.summary || resume.summary.includes("[X]")) fails.push("summary");
  if (!resume.personalInfo.email.includes("dana")) fails.push("email");
  if (/\b(10|15|20)\+? (people|engineers)\b/.test(JSON.stringify(resume)) && !JSON.stringify(resume).includes("8 engineer")) fails.push("possible invented numbers");
  console.log(fails.length ? `\n❌ FAILS: ${fails.join(", ")}` : "\n✅ ALL ASSERTIONS PASS");
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

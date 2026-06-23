// Local live test for the chat builder agent loop. Mirrors app/api/chat/build
// exactly (minus Clerk/KV): same system prompt, same tools, same text-only
// history reconstruction the client sends. Run: ANTHROPIC_API_KEY=sk-... npx tsx scripts/chat-builder-eval.ts
import Anthropic from "@anthropic-ai/sdk";
import { CV_TOOLS, applyCvToolCall, describeToolCall, snapshotForPrompt } from "@/lib/chat/cvTools";
import { buildChatSystemPrompt, chatGreeting } from "@/lib/chat/prompts";
import { initialResumeState, type ResumeData } from "@/types/resume";

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
  resume: ResumeData
): Promise<{ text: string; resume: ResumeData; toolLabels: string[]; rounds: number }> {
  const system = buildChatSystemPrompt(resume);
  const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  let text = "";
  const toolLabels: string[] = [];
  let rounds = 0;

  for (let round = 0; round < 6; round++) {
    rounds++;
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system,
      messages,
      tools: CV_TOOLS as Anthropic.Tool[],
      temperature: 0.6,
    });
    for (const block of resp.content) {
      if (block.type === "text") text += block.text;
      else if (block.type === "tool_use") {
        const next = applyCvToolCall(resume, block.name, block.input as Record<string, unknown>);
        if (next !== resume) toolLabels.push(describeToolCall(block.name, block.input as Record<string, unknown>));
        else toolLabels.push(`NO-OP! ${block.name} ${JSON.stringify(block.input).slice(0, 120)}`);
        resume = next;
      }
    }
    if (resp.stop_reason !== "tool_use") break;
    messages.push({ role: "assistant", content: resp.content });
    messages.push({
      role: "user",
      content: resp.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
        .map((b) => ({
          type: "tool_result" as const,
          tool_use_id: b.id,
          content: "Applied. The user can see the change in the live preview.",
        })),
    });
  }
  return { text, resume, toolLabels, rounds };
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
    const { text, resume: next, toolLabels, rounds } = await runTurn(history, resume);
    resume = next;
    console.log(`\n👤 ${turn}`);
    toolLabels.forEach((l) => console.log(`   ✦ ${l}`));
    console.log(`🤖 ${text.trim()}  [${rounds} round(s), ${((Date.now() - t0) / 1000).toFixed(1)}s]`);
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

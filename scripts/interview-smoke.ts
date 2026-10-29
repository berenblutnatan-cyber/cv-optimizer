// Live smoke test of interview practice, end to end except audio:
//   real questions (Claude) → a text-only conversation with the real
//   interviewer agent (EL_AGENT_INTERVIEW) → the transcript from ElevenLabs →
//   split into answers → real scoring (Claude) → the debrief.
//
//   npx tsx --conditions=react-server scripts/interview-smoke.ts
//
// Uses Anthropic + ElevenLabs credits (about two minutes). Nothing is saved.

import { config } from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { generateQuestions, scoreInterview } from "../lib/interview/ai";
import { answersFromTranscript, BEGIN_QUESTION_TOOL } from "../lib/interview/types";
import { interviewVariables } from "../lib/voice/agent";
import { fetchTranscript } from "../lib/voice/elevenlabs";
import { fullCv } from "../test/fixtures/fullCv";

config({ path: ".env.local" });
const key = process.env.ELEVENLABS_API_KEY!;
const agent = process.env.EL_AGENT_INTERVIEW!;

const JD = `Senior Product Manager, Payments at Globex (Tel Aviv). Own checkout and payments.
Requirements: 5+ years product management in B2C e-commerce or fintech; record of improving conversion through A/B testing;
strong SQL and metrics; leading cross-functional teams of engineers and designers; clear communication. Nice to have: Stripe/Adyen, fraud tooling.`;

const ANSWERS = [
  "Sure. I'm a product manager, most recently a senior PM at Acme Analytics where I own onboarding and pricing. Before that I was a PM at Globex.",
  "At Acme I rebuilt onboarding. Activation was stuck at 31 percent; I ran interviews, found the setup step was the drop-off, and we shipped a guided flow. Activation went to 46 percent in two quarters.",
  "We disagreed with sales about discounting. I pulled the cohort data in SQL, showed discounted accounts churned twice as fast, and we agreed on a trial instead.",
  "I ran 14 pricing experiments in one quarter with a team of four engineers and a designer. One of them, annual billing upfront, raised cash collected by 22 percent.",
  "I'd start by mapping the checkout funnel with the data team, then pick the biggest drop-off and test against it. I also saved the company a vendor contract worth 80 thousand dollars by moving us to an in-house tool.",
];

async function main() {
  const anthropic = new Anthropic();
  const content = fullCv().content;
  const t0 = Date.now();
  const questions = await generateQuestions(anthropic, { content, jd: JD, jobTitle: "Senior Product Manager", company: "Globex", analysis: null });
  console.log(`questions (${Math.round((Date.now() - t0) / 1000)}s):`);
  questions.forEach((q, i) => console.log(`  ${i + 1}. [${q.kind}; ${q.focus}] ${q.text}`));

  const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agent}`, { headers: { "xi-api-key": key } });
  const { signed_url } = (await r.json()) as { signed_url: string };
  const ws = new WebSocket(signed_url);
  let conversationId = "";
  let answered = 0;
  let marks = 0;
  await new Promise<void>((resolve) => {
    let idle: ReturnType<typeof setTimeout> | null = null;
    const reply = () => {
      if (idle) clearTimeout(idle);
      idle = setTimeout(() => {
        if (answered >= ANSWERS.length) return resolve();
        const text = answered === 0 && marks === 0 ? "Yes, ready." : ANSWERS[answered++];
        console.log(`\nUSER: ${text}`);
        ws.send(JSON.stringify({ type: "user_message", text }));
      }, 4500);
    };
    ws.onopen = () =>
      ws.send(
        JSON.stringify({
          type: "conversation_initiation_client_data",
          dynamic_variables: interviewVariables({ sessionId: "smoke_interview_0001", attempt: 0, jobTitle: "Senior Product Manager", company: "Globex", questions, startAt: 0, userName: "Dana" }),
          conversation_config_override: { conversation: { text_only: true } },
        }),
      );
    ws.onmessage = (ev) => {
      const m = JSON.parse(String(ev.data));
      if (m.type === "conversation_initiation_metadata") conversationId = m.conversation_initiation_metadata_event?.conversation_id;
      else if (m.type === "ping") ws.send(JSON.stringify({ type: "pong", event_id: m.ping_event?.event_id }));
      else if (m.type === "agent_response") {
        console.log(`AGENT: ${m.agent_response_event?.agent_response}`);
        reply();
      } else if (m.type === "client_tool_call") {
        const c = m.client_tool_call;
        if (c.tool_name === BEGIN_QUESTION_TOOL) marks++;
        console.log(`  TOOL ${c.tool_name} ${JSON.stringify(c.parameters)}`);
        ws.send(JSON.stringify({ type: "client_tool_result", tool_call_id: c.tool_call_id, result: "ok", is_error: false }));
      }
    };
    ws.onclose = () => resolve();
  });
  ws.close();
  console.log(`\nbegin_question marks: ${marks}; conversation ${conversationId ? "received" : "missing"}`);

  // The transcript is processed after the call ends: poll until final.
  let t: { final: boolean; transcript: unknown } = { final: false, transcript: [] };
  for (let i = 0; i < 30 && !t.final; i++) {
    await new Promise((res) => setTimeout(res, 3000));
    t = await fetchTranscript(key, conversationId);
  }
  console.log("transcript final:", t.final);
  const answers = answersFromTranscript(t.transcript, questions.length);
  console.log("answers mapped:", answers.map((a) => `Q${a.index + 1}: ${a.text.slice(0, 60)}…`));

  const report = await scoreInterview(anthropic, { content, jd: JD, jobTitle: "Senior Product Manager", questions, answers });
  console.log("\nREPORT overall", report.overall, "|", report.summary);
  for (const a of report.answers) {
    console.log(`  Q${a.index + 1} ${a.score}/10  worked: ${a.worked.join("; ")}  missing: ${a.missing.join("; ")}`);
    if (a.addToCv) console.log(`     ADD TO CV → ${a.addToCv.role} @ ${a.addToCv.company}: "${a.addToCv.bullet}"  (quote: "${a.addToCv.quote}")`);
  }
  console.log(`total ${Math.round((Date.now() - t0) / 1000)}s`);
}

main().catch((e) => {
  console.error("interview smoke failed:", e);
  process.exit(1);
});

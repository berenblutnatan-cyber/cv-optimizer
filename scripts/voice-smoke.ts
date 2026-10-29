// Live smoke test of the intake agent: a scripted text-only conversation with
// the real agent (EL_AGENT_INTAKE), its client tools answered by the app's own
// bridge and reducer, then the CV it built. Run after any prompt or tool change:
//
//   npx tsx scripts/voice-smoke.ts
//
// Uses ElevenLabs credits (text only, about a minute). Nothing is saved.
import { config } from "dotenv";
import { emptyDocument, applyDocumentOp, type ResumeDocument } from "../lib/resume/document";
import { VoiceToolBridge } from "../lib/voice/bridge";
import { intakeVariables } from "../lib/voice/agent";

config({ path: ".env.local" });
const key = process.env.ELEVENLABS_API_KEY!;
const agent = process.env.EL_AGENT_INTAKE!;
const SID = "cmtestlivecall0000000001";

const USER_TURNS = [
  "Hi, I'm Dana Levi. I'm a product manager at Acme in Tel Aviv, since 2022.",
  "I led the checkout redesign. Conversion went up 18 percent, and the team was six people.",
  "Before that I was a business analyst at Wix from 2019 to 2022.",
  "I have a BSc in computer science from the Technion, 2018. Skills: SQL, Figma, A/B testing.",
  "I want a senior product manager role. That's everything, thanks.",
];

async function main() {
  const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agent}`, { headers: { "xi-api-key": key } });
  const { signed_url } = (await r.json()) as { signed_url: string };
  if (!signed_url) throw new Error(`no signed url: ${r.status}`);

  let doc: ResumeDocument = emptyDocument();
  const saved: string[] = [];
  const bridge = new VoiceToolBridge(SID, 0, {
    applyVoice: (name, input, id) => {
      const next = applyDocumentOp(doc, name, input);
      if (next === doc) return false;
      doc = next;
      saved.push(`${id} ${name}`);
      return true;
    },
    getDoc: () => doc,
  });
  const tools = bridge.clientTools();

  const ws = new WebSocket(signed_url);
  let turn = 0;
  let conversationId = "";
  const done = new Promise<void>((resolve) => {
    let idle: ReturnType<typeof setTimeout> | null = null;
    const nextTurn = () => {
      if (idle) clearTimeout(idle);
      // Answer once the agent has been quiet for a moment (it may call several tools first).
      idle = setTimeout(() => {
        if (turn >= USER_TURNS.length) return resolve();
        const text = USER_TURNS[turn++];
        console.log(`\nUSER: ${text}`);
        ws.send(JSON.stringify({ type: "user_message", text }));
      }, 4000);
    };
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "conversation_initiation_client_data",
          dynamic_variables: intakeVariables({ content: doc.content, userName: null, sessionId: SID, attempt: 0, seconds: 300 }),
          conversation_config_override: { conversation: { text_only: true } },
        }),
      );
    };
    ws.onmessage = (ev) => {
      const m = JSON.parse(String(ev.data));
      if (m.type === "conversation_initiation_metadata") conversationId = m.conversation_initiation_metadata_event?.conversation_id;
      else if (m.type === "ping") ws.send(JSON.stringify({ type: "pong", event_id: m.ping_event?.event_id }));
      else if (m.type === "agent_response") {
        console.log(`AGENT: ${m.agent_response_event?.agent_response}`);
        nextTurn();
      } else if (m.type === "client_tool_call") {
        const c = m.client_tool_call;
        const handler = tools[c.tool_name];
        const result = handler ? handler(c.parameters) : `Unknown tool ${c.tool_name}`;
        console.log(`  TOOL ${c.tool_name} ${JSON.stringify(c.parameters).slice(0, 160)} -> ${result.split("\n")[0]}`);
        ws.send(JSON.stringify({ type: "client_tool_result", tool_call_id: c.tool_call_id, result, is_error: !handler }));
        nextTurn();
      } else if (m.type === "error" || m.type === "internal_error") console.log("ERROR EVENT", JSON.stringify(m).slice(0, 300));
    };
    ws.onclose = (ev) => {
      console.log(`closed ${ev.code} ${ev.reason}`);
      resolve();
    };
  });
  await done;
  ws.close();
  console.log("\nconversation:", conversationId ? "received id" : "none");
  console.log("saved ops:", saved.length, "\n" + saved.join("\n"));
  const c = doc.content;
  console.log("\nCV:", JSON.stringify({ name: c.personalInfo.name, title: c.personalInfo.title, location: c.personalInfo.location, experience: c.experience.map((e) => ({ company: e.company, role: e.role, start: e.startDate, end: e.endDate, bullets: e.description })), education: c.education.map((e) => [e.institution, e.degree, e.field]), skills: c.skills, summary: c.summary }, null, 1));
}

main().catch((e) => {
  console.error("live test failed:", e);
  process.exit(1);
});

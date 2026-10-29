// Create or update the ElevenLabs intake agent from lib/voice/agent.ts.
//
//   npx tsx scripts/voice-agent.ts            # dry run: print the config
//   npx tsx scripts/voice-agent.ts --apply    # create/update tools + agent
//
// Needs ELEVENLABS_API_KEY. Updates EL_AGENT_INTAKE when set, otherwise
// creates the agent and prints the id to put in EL_AGENT_INTAKE.
// The post-call webhook (/api/webhook/elevenlabs) and its secret are a
// workspace setting: set them once in the ElevenLabs dashboard.

import { config } from "dotenv";
import { ElevenLabsClient, type ElevenLabs } from "@elevenlabs/elevenlabs-js";
import { INTAKE_AGENT_NAME, INTAKE_FIRST_MESSAGE, INTAKE_PROMPT, intakeClientTools } from "../lib/voice/agent";
import { VOICE } from "../lib/voice/protocol";

config({ path: ".env.local" });
config({ path: ".env" });

const apply = process.argv.includes("--apply");
const apiKey = process.env.ELEVENLABS_API_KEY;
const agentId = process.env.EL_AGENT_INTAKE;
// Optional: a voice from your ElevenLabs library. Unset keeps the agent's default voice.
const voiceId = process.env.EL_INTAKE_VOICE_ID || undefined;

const tools = intakeClientTools();

const conversationConfig = {
  agent: {
    firstMessage: INTAKE_FIRST_MESSAGE,
    language: "en",
    disableFirstMessageInterruptions: false,
    maxConversationDurationMessage: "We're out of time for this call. Everything's saved on your CV.",
    dynamicVariables: {
      dynamicVariablePlaceholders: { voice_session_id: "", voice_attempt: "0", cv_snapshot: "(empty)", minutes: "5", opening: "Hi, I'm Hired." },
    },
    prompt: { prompt: INTAKE_PROMPT, llm: "claude-sonnet-5-5" as const, temperature: 0.3, toolIds: [] as string[] },
  },
  tts: { modelId: "eleven_v4_turbo" as const, voiceId },
  turn: { turnEagerness: "patient" as const, turnTimeout: 12, silenceEndCallTimeout: 60 },
  conversation: { maxDurationSeconds: VOICE.paidSeconds + 30 },
};

const platformSettings = {
  auth: { enableAuth: true },
  // Audio is never kept; transcripts are kept 30 days for reconciliation and support.
  privacy: { recordVoice: false, retentionDays: 30, deleteAudio: true },
};

async function main() {
  if (!apply) {
    console.log(JSON.stringify({ name: INTAKE_AGENT_NAME, conversationConfig, platformSettings, tools: tools.map((t) => t.name) }, null, 2));
    console.log("\nDry run. Pass --apply to write it to ElevenLabs.");
    return;
  }
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
  const client = new ElevenLabsClient({ apiKey });

  const existing = new Map<string, string>();
  let cursor: string | undefined;
  do {
    const page = await client.conversationalAi.tools.list({ types: "client", pageSize: 100, cursor });
    for (const t of page.tools) existing.set((t.toolConfig as { name: string }).name, t.id);
    cursor = page.hasMore ? page.nextCursor : undefined;
  } while (cursor);

  const toolIds: string[] = [];
  for (const tool of tools) {
    // The JSON Schema is plain data; ElevenLabs validates it on write.
    const t = tool as ElevenLabs.ToolRequestModelToolConfig & { name: string };
    const id = existing.get(t.name);
    if (id) {
      await client.conversationalAi.tools.update(id, { toolConfig: t });
      toolIds.push(id);
      console.log(`updated tool ${t.name}`);
    } else {
      const created = await client.conversationalAi.tools.create({ toolConfig: t });
      toolIds.push(created.id);
      console.log(`created tool ${t.name}`);
    }
  }
  conversationConfig.agent.prompt.toolIds = toolIds;

  if (agentId) {
    await client.conversationalAi.agents.update(agentId, { name: INTAKE_AGENT_NAME, conversationConfig, platformSettings });
    console.log(`updated agent ${agentId}`);
  } else {
    const created = await client.conversationalAi.agents.create({ name: INTAKE_AGENT_NAME, conversationConfig, platformSettings });
    console.log(`created agent ${created.agentId}\nSet EL_AGENT_INTAKE=${created.agentId} in .env.local and on Vercel.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

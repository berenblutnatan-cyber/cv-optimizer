import { anthropic, transcriptFetcher } from "@/lib/interview/http";
import { drainInterviews } from "@/lib/interview/store";
import { pruneRateLimits } from "@/lib/limits";
import { fetchConversation, voiceConfig } from "@/lib/voice/elevenlabs";
import { parseConversation } from "@/lib/voice/protocol";
import { drainVoice } from "@/lib/voice/sessions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Voice re-drive (daily in vercel.json, so it works on every Vercel plan;
// the webhook is the primary path): refunds sessions that never connected,
// closes ones the browser abandoned, reconciles calls whose webhook never
// came, and settles finished sessions. Secured by CRON_SECRET.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cfg = voiceConfig();
  const out = await drainVoice(cfg ? async (id) => parseConversation(await fetchConversation(cfg.apiKey, id)) : null);
  console.log("[voice drain]", JSON.stringify(out));
  const interviews = await drainInterviews(anthropic, transcriptFetcher());
  console.log("[interview drain]", JSON.stringify(interviews));
  const pruned = await pruneRateLimits().catch((err) => {
    console.error("[rate limits] prune failed", err);
    return 0;
  });
  return Response.json({ ...out, interviews, prunedRateLimits: pruned });
}

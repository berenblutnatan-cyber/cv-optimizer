import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { kv } from "@vercel/kv";
import { VOICE_AGENT_SYSTEM_PROMPT } from "@/lib/voice/prompts";
import { REALTIME_CV_TOOLS } from "@/lib/voice/realtimeTools";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const HOURLY_SESSION_CAP = 3;
const REALTIME_MODEL = "gpt-realtime";

// POST /api/voice/session
//
// Mints a short-lived OpenAI Realtime ephemeral key the browser uses to open
// a direct WebRTC connection. Uses the GA endpoint /v1/realtime/client_secrets
// — the beta /v1/realtime/sessions endpoint this route originally called has
// been REMOVED by OpenAI (404s), which silently broke voice sessions.
//
// Rate-limited per user (HOURLY_SESSION_CAP / hour) via Vercel KV.
export async function POST() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Sliding-window-ish rate limit. Cheap counter with 1h TTL on first set.
  try {
    const key = `voice:rl:${userId}`;
    const raw = await kv.get(key);
    const used = typeof raw === "number" ? raw : Number(raw ?? 0);
    if (Number.isFinite(used) && used >= HOURLY_SESSION_CAP) {
      return NextResponse.json(
        { error: `Limit reached (${HOURLY_SESSION_CAP}/hour). Take a breath and try again soon.` },
        { status: 429 }
      );
    }
    await kv.set(key, (Number.isFinite(used) ? used : 0) + 1, { ex: 60 * 60 });
  } catch (kvErr) {
    // KV is not critical for the feature; log and proceed.
    console.warn("[voice/session] KV rate-limit unavailable:", kvErr);
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: REALTIME_MODEL,
          instructions: VOICE_AGENT_SYSTEM_PROMPT,
          output_modalities: ["audio"],
          audio: {
            input: {
              transcription: { model: "whisper-1" },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 600,
              },
            },
            output: { voice: "verse" },
          },
          // Same tool layer as the chat builder — the voice agent patches the
          // live CV preview while the user talks (lib/voice/realtimeTools).
          tools: REALTIME_CV_TOOLS,
          tool_choice: "auto",
        },
      }),
    });
  } catch (err) {
    console.error("[voice/session] upstream call failed:", err);
    return NextResponse.json({ error: "Voice service unavailable" }, { status: 502 });
  }
  if (!upstream.ok) {
    const txt = await upstream.text().catch(() => "");
    console.error("[voice/session] upstream non-OK:", upstream.status, txt);
    return NextResponse.json(
      { error: "Voice service rejected the session request" },
      { status: 502 }
    );
  }
  const data = await upstream.json();
  return NextResponse.json({
    // GA shape: the ephemeral key is the top-level `value`.
    client_secret: data?.value ?? null,
    expires_at: data?.expires_at ?? null,
    model: REALTIME_MODEL,
  });
}

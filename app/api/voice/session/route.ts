import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { kv } from "@vercel/kv";
import { VOICE_AGENT_SYSTEM_PROMPT } from "@/lib/voice/prompts";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const HOURLY_SESSION_CAP = 3;

// POST /api/voice/session
//
// Mints a short-lived OpenAI Realtime API ephemeral key the browser uses to
// open a direct WebRTC connection to OpenAI. The key is valid for ~60s; the
// actual session can run up to 8 minutes (enforced both client-side via auto-
// finalize and server-side via the realtime API's session limits).
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

  // Request a Realtime session token directly from OpenAI. Their REST returns
  // the ephemeral client_secret the browser will use to authenticate the WebRTC
  // SDP exchange.
  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "verse",
        instructions: VOICE_AGENT_SYSTEM_PROMPT,
        modalities: ["audio", "text"],
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 600,
        },
        input_audio_transcription: { model: "whisper-1" },
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
    client_secret: data?.client_secret?.value ?? null,
    expires_at: data?.client_secret?.expires_at ?? null,
    model: "gpt-4o-realtime-preview-2024-12-17",
  });
}

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { ElevenLabsError, fetchTranscript, interviewVoiceConfig } from "@/lib/voice/elevenlabs";
import { InterviewError, interviewStatus, scoreSession, type TranscriptFetch } from "./store";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** The signed-in user, or a 401. Practice is account-only: it costs a credit. */
export async function interviewUser(): Promise<{ userId: string } | Response> {
  const { userId } = await auth();
  return userId ? { userId } : Response.json({ error: "Sign in to practice", code: "UNAUTHORIZED" }, { status: 401 });
}

const STATUS: Record<InterviewError["code"], number> = { NOT_FOUND: 404, BAD_REQUEST: 400, EXPIRED: 410, NO_CREDITS: 402, EMPTY_CV: 422 };

export function interviewErrorResponse(err: unknown, tag: string): Response {
  if (err instanceof InterviewError) return Response.json({ error: err.message, code: err.code }, { status: STATUS[err.code] });
  if (err instanceof ElevenLabsError) {
    console.error(`[${tag}]`, err.message);
    return Response.json({ error: "Voice isn't available right now. Try again in a minute.", code: "UNAVAILABLE" }, { status: 503 });
  }
  console.error(`[${tag}]`, err);
  return Response.json({ error: "Something went wrong. Try again.", code: "INTERNAL" }, { status: 500 });
}

/** Transcripts come from ElevenLabs; without a key, voice sessions wait for the cron. */
export function transcriptFetcher(): TranscriptFetch | null {
  const cfg = interviewVoiceConfig();
  return cfg ? (cid) => fetchTranscript(cfg.apiKey, cid) : null;
}

/**
 * After a voice call ends ElevenLabs needs a few seconds to finalise the
 * transcript: retry until it is scored, failed, or the window closes (the
 * cron picks up anything left).
 */
export async function scoreWhenReady(id: string, opts: { tries?: number; delayMs?: number } = {}): Promise<void> {
  const tries = opts.tries ?? 20;
  const delayMs = opts.delayMs ?? 5000;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await scoreSession(anthropic, id, transcriptFetcher());
      if (res === "done" || res === "failed") return;
      if (res === "skipped" && (await interviewStatus(id)) !== "scoring") return;
    } catch (err) {
      console.error("[interview:score]", id, err);
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
}

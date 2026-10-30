import "server-only";
import { auth } from "@clerk/nextjs/server";
import { ElevenLabsError } from "./elevenlabs";
import { VoiceError } from "./sessions";

/** The signed-in user, or a 401 response. Voice is account-only: it costs money. */
export async function voiceUser(): Promise<{ userId: string } | Response> {
  const { userId } = await auth();
  return userId ? { userId } : Response.json({ error: "Sign in to talk", code: "UNAUTHORIZED" }, { status: 401 });
}

const STATUS: Record<VoiceError["code"], number> = { NOT_FOUND: 404, BUSY: 409, NO_CREDITS: 402, EXPIRED: 410, UNAVAILABLE: 503, BAD_REQUEST: 400 };

export function voiceErrorResponse(err: unknown, tag: string): Response {
  if (err instanceof VoiceError) return Response.json({ error: err.message, code: err.code, ...err.detail }, { status: STATUS[err.code] });
  if (err instanceof ElevenLabsError) {
    console.error(`[${tag}]`, err.message);
    return Response.json({ error: "Voice isn't available right now. Try again in a minute.", code: "UNAVAILABLE" }, { status: 503 });
  }
  console.error(`[${tag}]`, err);
  return Response.json({ error: "Something went wrong. Try again.", code: "INTERNAL" }, { status: 500 });
}

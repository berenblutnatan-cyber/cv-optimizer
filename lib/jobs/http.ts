import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { LetterError } from "@/lib/cover/store";
import { JobError } from "./store";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function jobsUser(): Promise<{ userId: string } | Response> {
  const { userId } = await auth();
  return userId ? { userId } : Response.json({ error: "Sign in", code: "UNAUTHORIZED" }, { status: 401 });
}

export function jobsErrorResponse(err: unknown, tag: string): Response {
  if (err instanceof JobError || err instanceof LetterError) {
    const status = err.code === "NOT_FOUND" ? 404 : err.code === "NO_CREDITS" ? 402 : 400;
    return Response.json({ error: err.message, code: err.code }, { status });
  }
  console.error(`[${tag}]`, err);
  return Response.json({ error: "Something went wrong. Try again.", code: "INTERNAL" }, { status: 500 });
}

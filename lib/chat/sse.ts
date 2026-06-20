// Shared SSE frame reader + event types for the chat-first CV builder.
// The /api/chat/build route streams `data: {json}\n\n` frames; both the
// signed-in split builder and the public chat-first home consume them, so the
// parser lives here as the single source of truth.

import type { ResumeData } from "@/types/resume";

export type SseEvent =
  | { type: "text"; text: string }
  | { type: "tool_start"; name: string }
  | { type: "tool_noop"; name: string }
  | { type: "tool"; name: string; input: Record<string, unknown>; label: string }
  | { type: "resume"; resumeData: ResumeData }
  | { type: "done" }
  | { type: "error"; error: string };

export async function readSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (evt: SseEvent) => void
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.trim();
      if (!line.startsWith("data: ")) continue;
      try {
        onEvent(JSON.parse(line.slice(6)) as SseEvent);
      } catch {
        // skip malformed frame
      }
    }
  }
}

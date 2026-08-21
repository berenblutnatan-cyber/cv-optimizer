// SSE event contract + client reader for the streaming /api/analyze route.
// Server encodes `data: {json}\n\n` frames (same wire format as /api/chat/build).

import type { DeepAnalysis } from "./types";

export type AnalyzeStage = "parsing" | "auditing" | "rewriting" | "finalizing";

export type AnalyzeMeta = {
  mode: "quick" | "specific_role";
  jobTitle: string;
  jobUrl: string;
  companyName: string;
  cvTextUsed: string;
  jobDescriptionUsed: string;
};

export type AnalyzeStreamEvent =
  | { type: "stage"; stage: AnalyzeStage }
  | {
      // Early reveal — fires when pass 1 lands, while the rewrite still runs.
      type: "audit";
      overallScore: number;
      summary: string;
      strengths: string[];
      requirementCount: number;
      coveredCount: number;
      missingCount: number;
    }
  | { type: "result"; success: true; analysis: DeepAnalysis; analysisId: string; meta: AnalyzeMeta }
  | { type: "error"; error: string; failure_reason?: string; code?: string };

export async function readAnalyzeStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (evt: AnalyzeStreamEvent) => void
): Promise<void> {
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
        onEvent(JSON.parse(line.slice(6)) as AnalyzeStreamEvent);
      } catch {
        // skip malformed frame
      }
    }
  }
}

import "server-only";
import type Anthropic from "@anthropic-ai/sdk";

// One structured model call: JSON constrained to a schema (structured
// outputs). The 5.5 models reject forced tool_choice, so this is the supported
// way to get guaranteed-parseable output from them. Callers still validate
// and clamp every field: the schema guarantees shape, not truth.

export type Effort = "low" | "medium" | "high";
export type Schema = Record<string, unknown>;

// The installed SDK predates `output_config.format` and `fallbacks`; the API
// accepts them, so the params are sent through the beta endpoint as-is.
export async function structured(
  anthropic: Anthropic,
  p: { model: string; maxTokens: number; effort: Effort; system: string; schema: Schema; user: string },
): Promise<Record<string, unknown>> {
  const params = {
    model: p.model,
    max_tokens: p.maxTokens,
    system: p.system,
    thinking: { type: "adaptive" },
    output_config: { effort: p.effort, format: { type: "json_schema", schema: p.schema } },
    // A policy decline is re-run on a fallback model inside the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [{ role: "user", content: p.user }],
  };
  const r = (await anthropic.beta.messages.create(params as unknown as Parameters<typeof anthropic.beta.messages.create>[0])) as {
    stop_reason: string | null;
    content: { type: string; text?: string }[];
  };
  if (r.stop_reason === "max_tokens") throw new Error("model output was cut off");
  if (r.stop_reason === "refusal") throw new Error("model declined the request");
  const text = r.content
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("");
  try {
    const out = JSON.parse(text) as unknown;
    if (out && typeof out === "object" && !Array.isArray(out)) return out as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new Error("no structured output");
}

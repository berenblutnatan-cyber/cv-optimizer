import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import type { ResumeData } from "@/types/resume";
import { initialResumeState } from "@/types/resume";
import { CV_TOOLS, applyCvToolCall, describeToolCall, sanitizeDesign } from "@/lib/chat/cvTools";
import { buildChatSystemPrompt } from "@/lib/chat/prompts";
import { chatRateLimit } from "@/lib/chat/rateLimit";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_HISTORY_MESSAGES = 60;
// Big enough for an uploaded-CV turn (parse-cv caps extraction at 20k chars
// plus the framing text around it).
const MAX_MESSAGE_CHARS = 24_000;
const MAX_MODEL_ROUNDS = 8; // tool-use loop guard within one request
// A full-CV import emits many tool calls in one turn. 2000 was far too small —
// the model ran out of output budget mid-import (stop_reason "max_tokens") and
// the loop broke, so the CV was only half-read ("stuck mid reading"). 6000 lets
// a normal import finish in a single round; the max_tokens continuation below
// is the safety net for unusually large CVs.
const MAX_TOKENS = 6000;

type ChatMessage = { role: "user" | "assistant"; content: string };

function sseEncode(payload: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

// POST /api/chat/build
//
// Streaming chat turn for the conversational CV builder. The client sends the
// visible transcript (text only) plus its current ResumeData; the server runs
// a tool-use loop against Claude, applying each tool call to its own copy of
// the resume (authoritative) while streaming three event kinds to the client:
//   {type:"text", text}              — assistant text delta
//   {type:"tool", name, input, label} — a CV patch the client applies live
//   {type:"resume", resumeData}      — final authoritative state (if changed)
//   {type:"done"} / {type:"error", error}
export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
  }
  // Public ("try before signup"): logged-out home-page visitors can chat. Abuse
  // is bounded by per-IP (anon) / per-user (signed-in) hourly caps instead of a
  // hard auth gate. The sign-in wall lives downstream at export / paid score.
  const { userId } = await auth();
  const rl = await chatRateLimit(request, userId, "build");
  if (!rl.ok) return Response.json({ error: rl.error }, { status: 429 });
  const { t } = await getServerT();

  let body: { messages?: ChatMessage[]; resumeData?: ResumeData };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return Response.json({ error: "Last message must be from the user" }, { status: 400 });
  }

  // Anthropic requires alternating roles starting with "user". The client's
  // transcript starts with the locally-seeded greeting (assistant), so drop
  // leading assistant turns and merge any accidental same-role runs.
  while (history.length && history[0].role === "assistant") history.shift();
  const merged: ChatMessage[] = [];
  for (const m of history) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === m.role) prev.content += `\n${m.content}`;
    else merged.push({ ...m });
  }

  let resume: ResumeData =
    body.resumeData && typeof body.resumeData === "object"
      ? (body.resumeData as ResumeData)
      : initialResumeState;
  // Backstop for stale/partial client state — every array the reducer touches
  // must exist.
  resume = {
    ...initialResumeState,
    ...resume,
    personalInfo: { ...initialResumeState.personalInfo, ...(resume.personalInfo ?? {}) },
    experience: resume.experience ?? [],
    education: resume.education ?? [],
    skills: resume.skills ?? [],
    projects: resume.projects ?? [],
    certifications: resume.certifications ?? [],
    languages: resume.languages ?? [],
    customSections: resume.customSections ?? [],
  };

  // Fit telemetry from the client's auto-fit engine. Structured numbers only —
  // the prompt line is formatted server-side, so client text never reaches the
  // system prompt.
  const fitRaw = (body as { fit?: Record<string, unknown> }).fit;
  const fit =
    fitRaw && typeof fitRaw.ratio === "number" && Number.isFinite(fitRaw.ratio)
      ? {
          ratio: fitRaw.ratio,
          autoFit: fitRaw.autoFit === true,
          atMinimum: fitRaw.atMinimum === true,
          pageMode: fitRaw.pageMode === "multi" ? ("multi" as const) : ("one" as const),
        }
      : null;

  const system = buildChatSystemPrompt(resume, fit);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let anyToolApplied = false;
      let emittedText = false; // any text sent in a previous round
      try {
        const messages: Anthropic.MessageParam[] = merged.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        for (let round = 0; round < MAX_MODEL_ROUNDS; round++) {
          let roundEmittedText = false;
          const msgStream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: MAX_TOKENS,
            system,
            messages,
            tools: CV_TOOLS as Anthropic.Tool[],
            temperature: 0.6,
          });

          // Track partial tool inputs by content-block index while streaming.
          const toolBuf = new Map<number, { id: string; name: string; json: string }>();
          // Tool calls that COMPLETED this round (content_block_stop fired).
          // Used to rebuild a valid assistant turn when a "max_tokens" cutoff
          // truncates the final block — we replay only the whole calls, drop
          // the partial, and let the model finish reading on the next round.
          const roundToolUses: { id: string; name: string; input: Record<string, unknown> }[] = [];

          for await (const event of msgStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              // The model resumes mid-sentence after tool rounds; keep the
              // bubble readable by separating cross-round text segments.
              if (!roundEmittedText && emittedText) {
                controller.enqueue(sseEncode({ type: "text", text: "\n\n" }));
              }
              roundEmittedText = true;
              emittedText = true;
              controller.enqueue(sseEncode({ type: "text", text: event.delta.text }));
            } else if (
              event.type === "content_block_start" &&
              event.content_block.type === "tool_use"
            ) {
              toolBuf.set(event.index, {
                id: event.content_block.id,
                name: event.content_block.name,
                json: "",
              });
              // Heads-up so the client can show "Writing your summary…"
              // while the args stream; resolved by the matching "tool" event
              // (or dropped if the call turns out to be a no-op).
              controller.enqueue(
                sseEncode({ type: "tool_start", name: event.content_block.name })
              );
            } else if (
              event.type === "content_block_delta" &&
              event.delta.type === "input_json_delta"
            ) {
              const buf = toolBuf.get(event.index);
              if (buf) buf.json += event.delta.partial_json;
            } else if (event.type === "content_block_stop") {
              const buf = toolBuf.get(event.index);
              if (buf) {
                let input: Record<string, unknown> = {};
                try {
                  input = buf.json ? JSON.parse(buf.json) : {};
                } catch {
                  input = {};
                }
                if (buf.name === "set_design") {
                  // Design isn't part of ResumeData — it's client view state.
                  // Stream it on a dedicated "design" channel; the chip still
                  // shows so the user sees the format change happen.
                  const design = sanitizeDesign(input);
                  if (design) {
                    controller.enqueue(sseEncode({ type: "design", ...design }));
                    controller.enqueue(
                      sseEncode({
                        type: "tool",
                        name: buf.name,
                        input,
                        label: describeToolCall(buf.name, input, t),
                      })
                    );
                    roundToolUses.push({ id: buf.id, name: buf.name, input });
                  } else {
                    controller.enqueue(sseEncode({ type: "tool_noop", name: buf.name }));
                  }
                  toolBuf.delete(event.index);
                  continue;
                }
                const next = applyCvToolCall(resume, buf.name, input);
                const applied = next !== resume;
                resume = next;
                if (applied) {
                  anyToolApplied = true;
                  roundToolUses.push({ id: buf.id, name: buf.name, input });
                  controller.enqueue(
                    sseEncode({
                      type: "tool",
                      name: buf.name,
                      input,
                      label: describeToolCall(buf.name, input, t),
                    })
                  );
                } else {
                  // No-op call — tell the client to drop the pending chip.
                  controller.enqueue(sseEncode({ type: "tool_noop", name: buf.name }));
                }
                toolBuf.delete(event.index);
              }
            }
          }

          const final = await msgStream.finalMessage();

          if (final.stop_reason === "tool_use") {
            // Normal tool round: every block completed, so echo the model's
            // turn verbatim and answer each tool call, then let it keep going.
            messages.push({ role: "assistant", content: final.content });
            messages.push({
              role: "user",
              content: final.content
                .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
                .map((b) => ({
                  type: "tool_result" as const,
                  tool_use_id: b.id,
                  content: "Applied. The user can see the change in the live preview.",
                })),
            });
            continue;
          }

          if (final.stop_reason === "max_tokens" && roundToolUses.length > 0) {
            // The model ran out of output budget mid-import — the old code
            // broke here, leaving the CV half-read. Instead, replay only the
            // tool calls that fully completed (dropping any truncated trailing
            // block, which would be an invalid dangling tool_use) and nudge the
            // model to finish. Its own prior calls stay in context, so it won't
            // re-add what it already imported.
            messages.push({
              role: "assistant",
              content: roundToolUses.map((tu) => ({
                type: "tool_use" as const,
                id: tu.id,
                name: tu.name,
                input: tu.input,
              })),
            });
            messages.push({
              role: "user",
              content: [
                ...roundToolUses.map((tu) => ({
                  type: "tool_result" as const,
                  tool_use_id: tu.id,
                  content: "Applied. The user can see the change in the live preview.",
                })),
                {
                  type: "text" as const,
                  text: "Keep going — import anything from the CV you haven't captured yet, then give a one-line verdict and ask one question.",
                },
              ],
            });
            continue;
          }

          break;
        }

        if (anyToolApplied) {
          controller.enqueue(sseEncode({ type: "resume", resumeData: resume }));
        }
        controller.enqueue(sseEncode({ type: "done" }));
      } catch (err) {
        console.error("[chat/build] stream failed:", err);
        controller.enqueue(
          sseEncode({
            type: "error",
            error: t("The assistant hit a snag mid-reply — your CV is unchanged. Say that again and I'll pick it up."),
          })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

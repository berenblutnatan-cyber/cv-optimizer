import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import type { ResumeData } from "@/types/resume";
import { initialResumeState } from "@/types/resume";
import { CV_TOOLS, applyCvToolCall, sanitizeDesign } from "@/lib/chat/cvTools";
import { runChatTurn } from "@/lib/chat/runTurn";
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
      // The CV changed (as opposed to design-only calls, which ride the
      // separate "design" channel and never change ResumeData).
      let resumeChanged = false;
      try {
        await runChatTurn({
          client: anthropic,
          system,
          tools: CV_TOOLS as Anthropic.Tool[],
          messages: merged,
          t,
          emit: (e) => controller.enqueue(sseEncode(e)),
          onTool: (name, input) => {
            if (name === "set_design") {
              // Design isn't part of ResumeData here — it's client view state.
              const design = sanitizeDesign(input);
              if (!design) return false;
              controller.enqueue(sseEncode({ type: "design", ...design }));
              return true;
            }
            const next = applyCvToolCall(resume, name, input);
            if (next === resume) return false;
            resume = next;
            resumeChanged = true;
            return true;
          },
        });

        if (resumeChanged) {
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

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import type { BuilderChatMessage } from "@/stores/chatBuilderStore";
import { useT } from "@/lib/i18n/LanguageProvider";

// The agent occasionally bolds key phrases ("Hit **Finish & export**").
// Render just that — full markdown is overkill for 60-word coach replies.
function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") && p.length > 4 ? (
      <strong key={i} className="font-semibold">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

type Theme = "dark" | "light";

function ToolChips({ tools, theme = "dark" }: { tools: BuilderChatMessage["tools"]; theme?: Theme }) {
  if (!tools || tools.length === 0) return null;
  const light = theme === "light";
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {tools.map((t) => (
        <span
          key={t.id}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] ${
            light
              ? `bg-brand-navy/[0.05] border-brand-navy/12 ${t.pending ? "text-brand-navy/55 animate-pulse" : "text-brand-navy"}`
              : `bg-white/10 border-glass-border ${t.pending ? "text-white/60 animate-pulse" : "text-white/85"}`
          }`}
        >
          <Sparkles
            className={`h-3 w-3 ${
              t.pending ? (light ? "text-brand-navy/40" : "text-white/50") : light ? "text-brand-gold" : "text-[#f5b8c8]"
            }`}
          />
          {t.label}
        </span>
      ))}
    </div>
  );
}

export function ChatThread({
  messages,
  streaming,
  className = "",
  emptyExtras,
  theme = "dark",
}: {
  messages: BuilderChatMessage[];
  streaming: boolean;
  className?: string;
  /** Rendered under the greeting while the conversation is empty —
   * tappable starter cards (upload CV, tailor to a job, interview me). */
  emptyExtras?: ReactNode;
  /** "dark" for the glass shells, "light" for the Enhancv-style studio. */
  theme?: Theme;
}) {
  const { t } = useT();
  const light = theme === "light";
  const scrollRef = useRef<HTMLDivElement>(null);
  // Follow the stream unless the user deliberately scrolled up. Unsticking
  // only on upward scrollTop movement (not on distance-from-bottom) keeps
  // layout jitter — tab switches, content growth — from breaking the follow.
  const stickToBottom = useRef(true);
  const lastTopRef = useRef(0);
  const lastMessage = messages[messages.length - 1];

  // Instant scroll (not smooth): smooth scrolls get cancelled by the next
  // delta during streaming and the thread visibly stops following.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, lastMessage?.content, lastMessage?.tools?.length]);

  // Every new turn re-sticks — sending a message is an explicit "I'm at the
  // conversation's edge" signal even if the user had scrolled up before.
  useEffect(() => {
    if (!streaming) return;
    stickToBottom.current = true;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [streaming]);

  return (
    <div
      ref={scrollRef}
      onScroll={() => {
        const el = scrollRef.current;
        if (!el) return;
        const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (dist < 120) stickToBottom.current = true;
        else if (el.scrollTop < lastTopRef.current - 1) stickToBottom.current = false;
        lastTopRef.current = el.scrollTop;
      }}
      className={`overflow-y-auto ${className}`}
    >
      {/* Transcript echoes the user's resume content (PII) in both user and
          assistant bubbles, so mask it in Clarity replays. Behavior is still
          captured via custom events (chat_message_sent, chat_tool_applied). */}
      <div className="flex flex-col gap-5" data-clarity-mask="true">
        {messages.map((m) => {
          if (m.role === "user") {
            return (
              <div key={m.id} className="flex justify-end">
                {/* dir=auto: Hebrew/Arabic answers align right within the bubble */}
                <div
                  dir="auto"
                  className={`max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
                    light ? "bg-stone-100 text-[#1a1a1a]" : "bg-white text-[#1a1a1a]"
                  }`}
                >
                  {m.display ?? m.content}
                </div>
              </div>
            );
          }
          // Only the actively-streaming last turn shows the thinking dots. A
          // SETTLED assistant message with empty content (e.g. a turn that
          // applied tool calls but emitted no closing text) must never show a
          // perpetual "typing" indicator — that reads as "stuck". Its tool
          // chips carry the meaning instead.
          const isThinking = streaming && m.id === lastMessage?.id;
          return (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[46ch]">
                {/* Enhancv-style: assistant speaks as plain text (no bubble) in
                    the light studio; keeps the glass bubble in the dark shells. */}
                {(m.content || isThinking) && (
                  <div
                    dir="auto"
                    className={`text-[15px] leading-relaxed whitespace-pre-wrap ${
                      light
                        ? "text-[#1f2937] px-0.5"
                        : "rounded-2xl rounded-bl-md bg-white/10 border border-glass-border text-white px-4 py-2.5"
                    }`}
                  >
                    {m.content ? renderInlineBold(m.content) : (
                      <span className="inline-flex gap-1 items-center py-1" aria-label={t("Thinking")}>
                        <span className={`h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:0ms] ${light ? "bg-brand-navy/50" : "bg-white/70"}`} />
                        <span className={`h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:150ms] ${light ? "bg-brand-navy/50" : "bg-white/70"}`} />
                        <span className={`h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:300ms] ${light ? "bg-brand-navy/50" : "bg-white/70"}`} />
                      </span>
                    )}
                  </div>
                )}
                <ToolChips tools={m.tools} theme={theme} />
              </div>
            </div>
          );
        })}
        {messages.length <= 1 && !streaming ? emptyExtras : null}
        {streaming ? <span className="sr-only">{t("Assistant is typing")}</span> : null}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import type { BuilderChatMessage } from "@/stores/chatBuilderStore";

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

function ToolChips({ tools }: { tools: BuilderChatMessage["tools"] }) {
  if (!tools || tools.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {tools.map((t) => (
        <span
          key={t.id}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0A2647]/[0.05] border border-[#0A2647]/10 text-[11px] ${
            t.pending ? "text-[#0A2647]/60 animate-pulse" : "text-[#0A2647]/85"
          }`}
        >
          <Sparkles className={`h-3 w-3 ${t.pending ? "text-[#0A2647]/50" : "text-[#B8860B]"}`} />
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
}: {
  messages: BuilderChatMessage[];
  streaming: boolean;
  className?: string;
  /** Rendered under the greeting while the conversation is empty —
   * tappable starter cards (upload CV, tailor to a job, interview me). */
  emptyExtras?: ReactNode;
}) {
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
      <div className="flex flex-col gap-4">
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              {/* dir=auto: Hebrew/Arabic answers align right within the bubble */}
              <div dir="auto" className="max-w-[85%] rounded-2xl rounded-br-md bg-[#0A2647] text-[#fff] px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
                {m.display ?? m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[90%]">
                <div dir="auto" className="rounded-2xl rounded-bl-md bg-[#0A2647]/[0.05] border border-[#0A2647]/10 text-[#0A2647] px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
                  {m.content ? renderInlineBold(m.content) : (
                    <span className="inline-flex gap-1 items-center py-1" aria-label="Thinking">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#0A2647]/40 animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#0A2647]/40 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#0A2647]/40 animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </div>
                <ToolChips tools={m.tools} />
              </div>
            </div>
          )
        )}
        {messages.length <= 1 && !streaming ? emptyExtras : null}
        {streaming ? <span className="sr-only">Assistant is typing</span> : null}
      </div>
    </div>
  );
}

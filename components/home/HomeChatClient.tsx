"use client";

// Chat-first landing — clean & light (base44-inspired), and ALWAYS a fresh
// chat. The home conversation lives in LOCAL component state (not the persisted
// builder store), so every visit starts new — opening the home never drops you
// back into a half-finished session. Progress is only kept when the visitor
// explicitly hits "Save & open builder", which promotes the local conversation
// + CV into the persisted stores and hands off to /build/chat (the full
// split-screen builder + live preview + accordion).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { ArrowRight, BarChart3, ListChecks, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useResumeStore } from "@/store/useResumeStore";
import { useChatBuilderStore, type BuilderChatMessage } from "@/stores/chatBuilderStore";
import { applyCvToolCall, pendingToolLabel } from "@/lib/chat/cvTools";
import { chatGreeting, isPlaceholderSummary } from "@/lib/chat/prompts";
import { readSse } from "@/lib/chat/sse";
import { initialResumeState, generateId, type ResumeData } from "@/types/resume";
import { track } from "@/lib/analytics";
import { ChatComposer } from "@/components/chat/ChatComposer";

const STARTER_CHIPS = [
  "I'm a software engineer with 5 years' experience",
  "Interview me to get started",
  "Tailor my CV to a job post",
];

// Render the agent's occasional **bold** without pulling in a markdown lib.
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

export function HomeChatClient() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();

  // LOCAL, non-persisted state — the whole point: home is always a new chat.
  const [messages, setMessages] = useState<BuilderChatMessage[]>([]);
  const [cv, setCv] = useState<ResumeData>(initialResumeState);
  const [streaming, setStreaming] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const cvRef = useRef(cv);
  cvRef.current = cv;

  // Local message-store helpers (functional updates, no persistence).
  const addMessage = (m: BuilderChatMessage) => setMessages((l) => [...l, m]);
  const appendToMessage = (id: string, text: string) =>
    setMessages((l) => l.map((m) => (m.id === id ? { ...m, content: m.content + text } : m)));
  const updateMessage = (id: string, patch: Partial<BuilderChatMessage>) =>
    setMessages((l) => l.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const addToolToMessage = (id: string, tool: NonNullable<BuilderChatMessage["tools"]>[number]) =>
    setMessages((l) => l.map((m) => (m.id === id ? { ...m, tools: [...(m.tools ?? []), tool] } : m)));
  const resolvePendingTool = (id: string, label: string | null) =>
    setMessages((l) =>
      l.map((m) => {
        if (m.id !== id || !m.tools?.some((t) => t.pending)) return m;
        const idx = m.tools.findIndex((t) => t.pending);
        const tools =
          label === null
            ? m.tools.filter((_, i) => i !== idx)
            : m.tools.map((t, i) => (i === idx ? { ...t, label, pending: false } : t));
        return { ...m, tools };
      })
    );

  // Seed a fresh greeting on every mount. Local state means this runs new each
  // visit — no resume of a prior conversation.
  useEffect(() => {
    setHydrated(true);
    track("home_chat_opened");
    setMessages([{ id: generateId(), role: "assistant", content: chatGreeting(false) }]);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(text: string, display?: string) {
    if (streaming) return;
    addMessage({ id: generateId(), role: "user", content: text, display });
    const assistantId = generateId();
    addMessage({ id: assistantId, role: "assistant", content: "" });
    setStreaming(true);
    stick.current = true;
    track("home_chat_message_sent", { length: text.length });

    const current = cvRef.current;
    const outgoingCv = isPlaceholderSummary(current.summary) ? { ...current, summary: "" } : current;
    const history = [...messages, { id: "x", role: "user" as const, content: text }]
      .map((m) => ({ role: m.role, content: m.content }));

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/chat/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, resumeData: outgoingCv }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Couldn't reach the assistant");
      }
      let toolCount = 0;
      let gotText = false;
      await readSse(res.body, (evt) => {
        if (evt.type === "text") {
          gotText = true;
          appendToMessage(assistantId, evt.text);
        } else if (evt.type === "tool_start") {
          addToolToMessage(assistantId, {
            id: generateId(),
            label: pendingToolLabel(evt.name),
            pending: true,
          });
        } else if (evt.type === "tool_noop") {
          resolvePendingTool(assistantId, null);
        } else if (evt.type === "tool") {
          toolCount++;
          setCv((prev) => applyCvToolCall(prev, evt.name, evt.input));
          resolvePendingTool(assistantId, evt.label);
          track("home_chat_tool_applied", { tool: evt.name });
        } else if (evt.type === "resume") {
          setCv(evt.resumeData);
        } else if (evt.type === "error") {
          throw new Error(evt.error);
        }
      });
      if (toolCount === 0 && !gotText) {
        updateMessage(assistantId, { content: "Hmm, I lost my train of thought — say that again?" });
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        track("home_chat_error", { stage: "stream" });
        const msg = err instanceof Error ? err.message : "Something broke";
        updateMessage(assistantId, { content: `⚠️ ${msg}` });
        toast.error(msg);
      }
    } finally {
      // Drop any shimmer chips the stream never resolved (error/abort paths).
      setMessages((l) =>
        l.map((m) =>
          m.id === assistantId ? { ...m, tools: (m.tools ?? []).filter((t) => !t.pending) } : m
        )
      );
      setStreaming(false);
      abortRef.current = null;
    }
  }

  async function handleUpload(file: File) {
    if (streaming || uploadingCv) return;
    setUploadingCv(true);
    track("home_chat_cv_uploaded", { size: file.size, type: file.type });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/chat/parse-cv", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Couldn't read that file");
      await send(
        `I'm uploading my existing CV (${data.fileName}). Here's its full text — pull everything useful into the builder, then tell me what's missing or weak:\n\n"""\n${data.text}\n"""`,
        `📎 ${data.fileName}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingCv(false);
    }
  }

  // Promote the local session into the persisted builder stores, then hand off
  // to /build/chat (signing in first for anonymous visitors). This is the ONLY
  // path that keeps the conversation — home itself never persists it.
  function saveAndOpenBuilder() {
    useChatBuilderStore.setState({ messages });
    useResumeStore.getState().setResumeData(cvRef.current);
    track("home_chat_finished", { signedIn: Boolean(isSignedIn) });
    if (isSignedIn) {
      router.push("/build/chat");
    } else {
      openSignIn({ forceRedirectUrl: "/build/chat", fallbackRedirectUrl: "/build/chat" });
    }
  }

  const started = messages.some((m) => m.role === "user");
  const hasCv = Boolean(cv.personalInfo.name.trim()) || cv.experience.length > 0;

  // The "old way" entry points — always available, visually quiet.
  const manualLinks = (
    <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 text-sm">
      <span className="text-stone-400">Or do it the old way:</span>
      <Link href="/score" className="inline-flex items-center gap-1 text-stone-600 hover:text-[#0A2647] font-medium transition-colors">
        <BarChart3 className="h-3.5 w-3.5" /> Check CV Score
      </Link>
      <span className="text-stone-300">·</span>
      <Link href="/builder" className="inline-flex items-center gap-1 text-stone-600 hover:text-[#0A2647] font-medium transition-colors">
        <ListChecks className="h-3.5 w-3.5" /> Build manually
      </Link>
      <span className="text-stone-300">·</span>
      <Link href="/optimize" className="inline-flex items-center gap-1 text-stone-600 hover:text-[#0A2647] font-medium transition-colors">
        <Wand2 className="h-3.5 w-3.5" /> Optimize existing
      </Link>
    </div>
  );

  if (!hydrated) return null;

  // EMPTY STATE — a single, clean, centered chat box (base44-style).
  if (!started) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl mx-auto">
          <h1 className="text-center font-serif text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] leading-tight">
            Let&apos;s build your CV
          </h1>
          <p className="text-center text-stone-500 mt-3 text-base sm:text-lg font-light">
            Just start talking. Type, paste, or upload your old CV — I&apos;ll write it as we go.
          </p>

          <div className="mt-7">
            <ChatComposer
              theme="light"
              minRows={2}
              chips={[]}
              onSend={send}
              onUpload={handleUpload}
              uploading={uploadingCv}
              disabled={streaming || uploadingCv}
              placeholder="Tell me about your experience — or tap 📎 to upload your CV"
              uploadingLabel="Reading your CV…"
            />
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {STARTER_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={streaming || uploadingCv}
                onClick={() => send(chip)}
                className="px-3.5 py-2 rounded-full bg-white border border-stone-200 text-sm text-stone-600 hover:text-[#0A2647] hover:border-stone-300 shadow-sm transition-colors disabled:opacity-40"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="mt-10">{manualLinks}</div>
        </div>
      </div>
    );
  }

  // ACTIVE STATE — a clean light conversation.
  return (
    <div className="h-full flex flex-col max-w-2xl w-full mx-auto px-4">
      {hasCv ? (
        <div className="flex-shrink-0 flex items-center justify-between gap-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-stone-500">
            <Sparkles className="h-3.5 w-3.5 text-[#B8860B]" />
            Building your CV live
          </span>
          <button
            type="button"
            onClick={saveAndOpenBuilder}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0A2647] text-white text-xs font-semibold hover:bg-[#0d3259] transition-colors"
          >
            {isSignedIn ? "Save & open builder" : "Save & finish — sign up free"}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={() => {
          const el = scrollRef.current;
          if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
        className="flex-1 min-h-0 overflow-y-auto py-4"
      >
        <div className="flex flex-col gap-4">
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div dir="auto" className="max-w-[85%] rounded-2xl rounded-br-md bg-[#0A2647] text-white px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
                  {m.display ?? m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex justify-start">
                <div className="max-w-[90%]">
                  <div dir="auto" className="rounded-2xl rounded-bl-md bg-white border border-stone-200 text-[#1a1a1a] px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap shadow-sm">
                    {m.content ? (
                      renderInlineBold(m.content)
                    ) : (
                      <span className="inline-flex gap-1 items-center py-1" aria-label="Thinking">
                        <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce" />
                        <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:300ms]" />
                      </span>
                    )}
                  </div>
                  {m.tools && m.tools.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {m.tools.map((t) => (
                        <span
                          key={t.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] ${
                            t.pending
                              ? "bg-stone-50 border-stone-200 text-stone-400 animate-pulse"
                              : "bg-[#B8860B]/10 border-[#B8860B]/20 text-[#8a6608]"
                          }`}
                        >
                          <Sparkles className={`h-3 w-3 ${t.pending ? "text-stone-300" : "text-[#B8860B]"}`} />
                          {t.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      <div className="flex-shrink-0 pt-1 pb-1">
        <ChatComposer
          theme="light"
          chips={[]}
          onSend={send}
          onUpload={handleUpload}
          uploading={uploadingCv}
          disabled={streaming || uploadingCv}
          placeholder="Type your answer, or tap 📎 to upload your CV"
          uploadingLabel="Reading your CV…"
        />
        <div className="mt-3">{manualLinks}</div>
      </div>
    </div>
  );
}

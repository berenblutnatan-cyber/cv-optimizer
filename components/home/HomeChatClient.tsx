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
import { ArrowRight, Award, BarChart3, ListChecks, ShieldCheck, Sparkles, Target, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useResumeStore } from "@/store/useResumeStore";
import { useChatBuilderStore, type BuilderChatMessage } from "@/stores/chatBuilderStore";
import { applyCvToolCall, pendingToolLabel } from "@/lib/chat/cvTools";
import { chatGreeting, isPlaceholderSummary } from "@/lib/chat/prompts";
import { readSse } from "@/lib/chat/sse";
import { firstUrl, fetchJobPosting, withJobPosting } from "@/lib/chat/jobUrl";
import { initialResumeState, generateId, type ResumeData } from "@/types/resume";
import { track } from "@/lib/analytics";
import { ChatComposer } from "@/components/chat/ChatComposer";

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
  const [fetchingJob, setFetchingJob] = useState(false);
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

  // Composer entry point: if the message contains a job URL, read the posting
  // server-side and fold it into what the agent sees (so it tailors against the
  // real job). On any failure, send the raw message — the agent then asks for a
  // pasted description.
  async function handleSend(text: string) {
    if (streaming || uploadingCv || fetchingJob) return;
    const url = firstUrl(text);
    if (!url) {
      void send(text);
      return;
    }
    setFetchingJob(true);
    const tid = toast.loading("Reading the job post…");
    try {
      const job = await fetchJobPosting(url);
      toast.dismiss(tid);
      if (job.ok) {
        toast.success("Got the job post — tailoring to it now");
        await send(withJobPosting(text, url, job), text);
      } else {
        toast.message(job.error ?? "Couldn't open that link — paste the description and I'll use it.");
        await send(text);
      }
    } finally {
      setFetchingJob(false);
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
      const framing = `I'm uploading my existing CV (${data.fileName}). Here's its full text — pull everything useful into the builder, then tell me what's missing or weak:\n\n"""\n${data.text}\n"""`;
      await send(framing, `📎 ${data.fileName}`);
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

  // Anti-abuse / funnel gate: anonymous visitors get 3 free prompts, then must
  // sign in to keep building (their chat is preserved across the sign-in).
  const ANON_FREE_PROMPTS = 3;
  const userMsgCount = messages.reduce((n, m) => (m.role === "user" ? n + 1 : n), 0);
  const gated = !isSignedIn && userMsgCount >= ANON_FREE_PROMPTS;

  // The other ways to build — proper, noticeable buttons (not faint links),
  // each with its own accent so they stand out on the chat screen too.
  const entryButtons = (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
      <Link
        href="/score"
        className="group inline-flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-xl bg-white border border-stone-200 shadow-sm hover:shadow-md hover:border-[#0A2647]/40 hover:-translate-y-0.5 transition-all"
      >
        <span className="grid place-items-center h-7 w-7 rounded-lg bg-[#0A2647]/8 text-[#0A2647] group-hover:bg-[#0A2647]/15 transition-colors">
          <BarChart3 className="h-4 w-4" strokeWidth={1.8} />
        </span>
        <span className="text-sm font-semibold text-[#1a1a1a]">Check CV Score</span>
      </Link>
      <Link
        href="/builder"
        className="group inline-flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-xl bg-white border border-stone-200 shadow-sm hover:shadow-md hover:border-indigo-400/60 hover:-translate-y-0.5 transition-all"
      >
        <span className="grid place-items-center h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
          <ListChecks className="h-4 w-4" strokeWidth={1.8} />
        </span>
        <span className="text-sm font-semibold text-[#1a1a1a]">Build manually</span>
      </Link>
      <Link
        href="/optimize"
        className="group inline-flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-xl bg-white border border-stone-200 shadow-sm hover:shadow-md hover:border-[#B8860B]/60 hover:-translate-y-0.5 transition-all"
      >
        <span className="grid place-items-center h-7 w-7 rounded-lg bg-[#B8860B]/10 text-[#B8860B] group-hover:bg-[#B8860B]/20 transition-colors">
          <Wand2 className="h-4 w-4" strokeWidth={1.8} />
        </span>
        <span className="text-sm font-semibold text-[#1a1a1a]">Optimize existing</span>
      </Link>
    </div>
  );

  if (!hydrated) return null;

  // EMPTY STATE — the inviting hero. Leads with the low-friction classic-form
  // paths (Optimize / Tailor straight into /optimize, plus the free Score
  // check) as the prominent primary CTAs; the AI-chat path sits below as a
  // clearly-secondary option. Buttons NAVIGATE — they don't fire chat prompts.
  if (!started) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-3xl mx-auto">
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-stone-200 shadow-sm text-[12px] text-stone-600">
                <Sparkles className="h-3.5 w-3.5 text-[#B8860B]" />
                Powered by Claude · Scored on real ATS rules
              </span>
            </div>

            <h1 className="text-center font-serif text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] leading-tight mt-5">
              Get a CV that gets you hired
            </h1>
            <p className="text-center text-stone-500 mt-3 text-base sm:text-lg font-light max-w-xl mx-auto">
              Upload your CV and we&apos;ll sharpen it for the role you want — line by line,
              the way recruiters and ATS actually read it.
            </p>

            {/* Primary paths — the proven, low-friction form. These NAVIGATE. */}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Link
                href="/optimize?mode=quick"
                onClick={() => track("home_cta_click", { target: "optimize" })}
                className="group relative flex flex-col rounded-2xl bg-[#0A2647] text-white p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <span className="absolute top-3 right-3 text-[10px] font-medium uppercase tracking-wider bg-[#B8860B] text-white px-2 py-0.5 rounded-full">
                  Popular
                </span>
                <span className="grid place-items-center h-10 w-10 rounded-xl bg-white/10">
                  <Wand2 className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="mt-3 font-semibold text-[15px]">Optimize my CV</span>
                <span className="mt-1 text-[13px] text-white/70 leading-snug">
                  Upload it and we&apos;ll fix every line in minutes.
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-white/90">
                  Start <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>

              <Link
                href="/optimize"
                onClick={() => track("home_cta_click", { target: "tailor" })}
                className="group relative flex flex-col rounded-2xl bg-white border border-stone-200 p-5 shadow-sm hover:shadow-md hover:border-[#B8860B]/50 hover:-translate-y-0.5 transition-all"
              >
                <span className="grid place-items-center h-10 w-10 rounded-xl bg-[#B8860B]/10 text-[#B8860B]">
                  <Target className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="mt-3 font-semibold text-[15px] text-[#1a1a1a]">Tailor to a job</span>
                <span className="mt-1 text-[13px] text-stone-500 leading-snug">
                  Match your CV to a specific role or job post.
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[#0A2647]">
                  Start <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>

              <Link
                href="/score"
                onClick={() => track("home_cta_click", { target: "score" })}
                className="group relative flex flex-col rounded-2xl bg-white border border-stone-200 p-5 shadow-sm hover:shadow-md hover:border-[#0A2647]/40 hover:-translate-y-0.5 transition-all"
              >
                <span className="absolute top-3 right-3 text-[10px] font-medium uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  Free
                </span>
                <span className="grid place-items-center h-10 w-10 rounded-xl bg-[#0A2647]/8 text-[#0A2647]">
                  <BarChart3 className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="mt-3 font-semibold text-[15px] text-[#1a1a1a]">Check my score</span>
                <span className="mt-1 text-[13px] text-stone-500 leading-snug">
                  See where you stand in 60s. No signup.
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[#0A2647]">
                  Start <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            </div>

            {/* Secondary — the AI-chat path, kept but quieter. */}
            <div className="mt-8">
              <div className="flex items-center gap-3 max-w-xl mx-auto">
                <span className="h-px flex-1 bg-stone-200" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-stone-400 whitespace-nowrap">
                  Or build it from a conversation
                </span>
                <span className="h-px flex-1 bg-stone-200" />
              </div>

              <div className="mt-4 max-w-xl mx-auto">
                <ChatComposer
                  theme="light"
                  minRows={2}
                  chips={[]}
                  onSend={handleSend}
                  onUpload={handleUpload}
                  uploading={uploadingCv}
                  disabled={streaming || uploadingCv || fetchingJob}
                  placeholder="Tell me your experience, paste a job link, or tap 📎 to upload your CV"
                  uploadingLabel="Reading your CV…"
                />
                <div className="mt-3 flex flex-wrap justify-center gap-2.5">
                  <button
                    type="button"
                    disabled={streaming || uploadingCv}
                    onClick={() => send("Let's build my CV from scratch — I'll tell you my story.")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-stone-300 text-[#1a1a1a] text-sm font-medium hover:border-[#0A2647]/50 hover:bg-stone-50 shadow-sm transition-all disabled:opacity-40"
                  >
                    <Sparkles className="h-4 w-4 text-[#B8860B]" />
                    Tell me your story
                  </button>
                  <Link
                    href="/builder"
                    onClick={() => track("home_cta_click", { target: "builder" })}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-stone-200 text-stone-600 text-sm hover:text-[#0A2647] hover:border-stone-300 shadow-sm transition-all"
                  >
                    <ListChecks className="h-4 w-4 text-indigo-600" />
                    Build manually
                  </Link>
                </div>
              </div>
            </div>

            {/* Credibility strip — honest framing, no fabricated numbers */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-stone-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#0A2647]" /> Scored on real ATS rules
              </span>
              <span className="text-stone-300">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-[#0A2647]" /> Recruiter-reviewed templates
              </span>
              <span className="text-stone-300">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#B8860B]" /> Powered by Claude
              </span>
            </div>
          </div>
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
        {gated ? (
          <div className="rounded-2xl border border-[#0A2647]/15 bg-[#0A2647]/[0.04] px-4 py-4 text-center">
            <p className="text-sm font-semibold text-[#1a1a1a]">
              That&apos;s your {ANON_FREE_PROMPTS} free messages 🎉
            </p>
            <p className="text-sm text-stone-500 mt-1">
              Sign in (free) to save this chat and keep building — your work is waiting for you.
            </p>
            <button
              type="button"
              onClick={saveAndOpenBuilder}
              className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#0d3259] shadow-sm hover:shadow-md transition-all"
            >
              Sign in &amp; keep building
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <ChatComposer
            theme="light"
            chips={[]}
            onSend={handleSend}
            onUpload={handleUpload}
            uploading={uploadingCv}
            disabled={streaming || uploadingCv || fetchingJob}
            placeholder="Reply, paste a job link, or tap 📎 to upload your CV"
            uploadingLabel="Reading your CV…"
          />
        )}
        <div className="mt-3">{entryButtons}</div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Eye,
  MessageCircle,
  Mic,
  Pencil,
  RotateCcw,
  Sparkles,
  Target,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { useResumeStore } from "@/store/useResumeStore";
import { useChatBuilderStore } from "@/stores/chatBuilderStore";
import { applyCvToolCall, pendingToolLabel } from "@/lib/chat/cvTools";
import { chatGreeting, isPlaceholderSummary } from "@/lib/chat/prompts";
import { convertToPreviewData } from "@/lib/resumeDataConverter";
import { generateId } from "@/types/resume";
import { SmartResumePreview } from "@/components/shared/SmartResumePreview";
import { BuilderTemplateId, ThemeColor } from "@/context/BuilderContext";
import { track } from "@/lib/analytics";
import { readSse } from "@/lib/chat/sse";
import { firstUrl, fetchJobPosting, withJobPosting } from "@/lib/chat/jobUrl";
import { ChatThread } from "./ChatThread";
import { ChatComposer } from "./ChatComposer";
import { BuildProgress } from "./BuildProgress";
import { GuidedSectionsPreview } from "./GuidedSectionsPreview";

export function ChatBuilderClient() {
  const router = useRouter();
  const resumeData = useResumeStore((s) => s.resumeData);
  const setResumeData = useResumeStore((s) => s.setResumeData);
  const resetResume = useResumeStore((s) => s.resetResume);
  const {
    messages,
    addMessage,
    appendToMessage,
    addToolToMessage,
    resolvePendingTool,
    updateMessage,
    clear,
  } = useChatBuilderStore();

  const [streaming, setStreaming] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  const [previewView, setPreviewView] = useState<"guided" | "document">("guided");
  // Preview is OPT-IN — the build is a conversation first; the user chooses to
  // open the CV preview (and switch templates) when they want to see it render.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fetchingJob, setFetchingJob] = useState(false);
  const [prefill, setPrefill] = useState("");
  const [prefillNonce, setPrefillNonce] = useState(0);
  const [unseenUpdates, setUnseenUpdates] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<BuilderTemplateId>("ivy-league");
  const [selectedColor, setSelectedColor] = useState<ThemeColor>("indigo");
  const [hydrated, setHydrated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const mobileTabRef = useRef(mobileTab);
  mobileTabRef.current = mobileTab;

  // Seed the greeting locally after the persisted transcript hydrates —
  // zustand/persist restores synchronously from localStorage on first
  // client render, so one effect tick is enough.
  useEffect(() => {
    setHydrated(true);
    track("chat_builder_opened");
    const { messages: current } = useChatBuilderStore.getState();
    if (current.length === 0) {
      const { resumeData: cv } = useResumeStore.getState();
      const hasCv = Boolean(cv.personalInfo.name.trim()) || cv.experience.length > 0;
      useChatBuilderStore.getState().addMessage({
        id: generateId(),
        role: "assistant",
        content: chatGreeting(hasCv),
      });
    }
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text: string, display?: string) {
    if (streaming) return;
    const userMsg = { id: generateId(), role: "user" as const, content: text, display };
    addMessage(userMsg);
    const assistantId = generateId();
    addMessage({ id: assistantId, role: "assistant", content: "" });
    setStreaming(true);
    track("chat_message_sent", { length: text.length });

    // Strip the wizard's placeholder summary so the agent doesn't treat
    // template filler as a real summary.
    const cv = useResumeStore.getState().resumeData;
    const outgoingCv = isPlaceholderSummary(cv.summary) ? { ...cv, summary: "" } : cv;
    const history = [...useChatBuilderStore.getState().messages]
      .filter((m) => m.id !== assistantId)
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
      await readSse(res.body, (evt) => {
        if (evt.type === "text") {
          appendToMessage(assistantId, evt.text);
        } else if (evt.type === "tool_start") {
          // Shimmer chip while the args stream; resolved by "tool"/"tool_noop".
          addToolToMessage(assistantId, {
            id: generateId(),
            label: pendingToolLabel(evt.name),
            pending: true,
          });
        } else if (evt.type === "tool_noop") {
          resolvePendingTool(assistantId, null);
        } else if (evt.type === "tool") {
          toolCount++;
          const current = useResumeStore.getState().resumeData;
          setResumeData(applyCvToolCall(current, evt.name, evt.input));
          resolvePendingTool(assistantId, evt.label);
          track("chat_tool_applied", { tool: evt.name });
          if (mobileTabRef.current === "chat") setUnseenUpdates((n) => n + 1);
        } else if (evt.type === "resume") {
          // Server state is authoritative — corrects any client-side drift.
          setResumeData(evt.resumeData);
        } else if (evt.type === "error") {
          throw new Error(evt.error);
        }
      });
      if (toolCount === 0 && !useChatBuilderStore.getState().messages.find((m) => m.id === assistantId)?.content) {
        updateMessage(assistantId, { content: "Hmm, I lost my train of thought — say that again?" });
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        track("chat_error", { stage: "stream" });
        const msg = err instanceof Error ? err.message : "Something broke";
        updateMessage(assistantId, {
          content: `⚠️ ${msg}`,
        });
        toast.error(msg);
      }
    } finally {
      // Drop any shimmer chips the stream never resolved (error/abort paths).
      for (let i = 0; i < 25; i++) {
        const msg = useChatBuilderStore.getState().messages.find((m) => m.id === assistantId);
        if (!msg?.tools?.some((t) => t.pending)) break;
        resolvePendingTool(assistantId, null);
      }
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function quickEdit(text: string) {
    setMobileTab("chat");
    setPrefill(text);
    setPrefillNonce((n) => n + 1);
    track("chat_quick_edit_clicked");
  }

  // Read a pasted job URL server-side and fold the posting into what the agent
  // sees; fall back to the raw message if it can't be read.
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
    track("chat_cv_uploaded", { size: file.size, type: file.type });
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

  function onFinish() {
    track("chat_builder_finished");
    router.push("/builder?step=6&from=chat");
  }

  function onReset() {
    const ok = window.confirm(
      "Start over? This clears the conversation AND the CV draft. It can't be undone."
    );
    if (!ok) return;
    abortRef.current?.abort();
    clear();
    resetResume();
    track("chat_builder_reset");
    addMessage({ id: generateId(), role: "assistant", content: chatGreeting(false) });
  }

  const previewData = convertToPreviewData(
    isPlaceholderSummary(resumeData.summary) ? { ...resumeData, summary: "" } : resumeData
  );

  const hasCv =
    Boolean(resumeData.personalInfo.name.trim()) || resumeData.experience.length > 0;

  // Quick-edit chips above the preview: one tap → composer prefilled with an
  // edit request for that section. Only sections that exist get a chip.
  const quickEdits: { label: string; prompt: string }[] = [
    ...(!isPlaceholderSummary(resumeData.summary)
      ? [{ label: "Summary", prompt: "Punch up my summary — " }]
      : []),
    ...(resumeData.experience.length > 0
      ? [{ label: "Experience", prompt: "Strengthen my experience bullets — " }]
      : []),
    ...(resumeData.skills.length > 0
      ? [{ label: "Skills", prompt: "Rework my skills list — " }]
      : []),
    ...(resumeData.education.length > 0
      ? [{ label: "Education", prompt: "Update my education — " }]
      : []),
  ];

  const emptyExtras = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
      <label className="cursor-pointer rounded-2xl bg-white/8 border border-glass-border hover:bg-white/15 transition-colors p-3.5 flex items-start gap-3">
        <UploadCloud className="h-5 w-5 text-[#f5b8c8] flex-shrink-0 mt-0.5" />
        <span>
          <span className="block text-sm text-white font-medium">Upload my current CV</span>
          <span className="block text-xs text-white/60 mt-0.5">
            PDF or Word in, everything pulled into the builder
          </span>
        </span>
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </label>
      {hasCv ? (
        <button
          type="button"
          onClick={() => send("Interview me — ask me what's new and help me update this CV.")}
          className="text-left rounded-2xl bg-white/8 border border-glass-border hover:bg-white/15 transition-colors p-3.5 flex items-start gap-3"
        >
          <Sparkles className="h-5 w-5 text-[#c9b8ff] flex-shrink-0 mt-0.5" />
          <span>
            <span className="block text-sm text-white font-medium">Interview me — what&apos;s new?</span>
            <span className="block text-xs text-white/60 mt-0.5">
              Not sure what to add? I&apos;ll ask the right questions
            </span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => send("Tailor it to a job post")}
          className="text-left rounded-2xl bg-white/8 border border-glass-border hover:bg-white/15 transition-colors p-3.5 flex items-start gap-3"
        >
          <Target className="h-5 w-5 text-[#c9b8ff] flex-shrink-0 mt-0.5" />
          <span>
            <span className="block text-sm text-white font-medium">Tailor to a job post</span>
            <span className="block text-xs text-white/60 mt-0.5">
              Paste a posting, get a CV aimed at it
            </span>
          </span>
        </button>
      )}
    </div>
  );

  if (!hydrated) return null;

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Slim header */}
      <header className="flex-shrink-0 px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="grid place-items-center h-9 w-9 rounded-xl bg-white/10 border border-glass-border text-white/75 hover:text-white hover:bg-white/15 transition-colors"
          >
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </Link>
          <div className="min-w-0">
            <div className="font-serif italic text-lg md:text-xl text-white leading-none truncate">
              Tell us your story
            </div>
            <div className="text-[11px] text-white/55 mt-0.5 hidden sm:block">
              Chat CV builder — type or talk, watch it build
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPreviewOpen((v) => {
                const next = !v;
                setMobileTab(next ? "preview" : "chat");
                if (next) setUnseenUpdates(0);
                return next;
              });
            }}
            aria-pressed={previewOpen}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs transition-colors ${
              previewOpen
                ? "bg-white text-[#1a1a1a] border-transparent font-medium"
                : "bg-white/8 border-glass-border text-white/75 hover:bg-white/15 hover:text-white"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{previewOpen ? "Hide preview" : "Preview"}</span>
            {!previewOpen && unseenUpdates > 0 ? (
              <span className="min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full bg-[#f5b8c8] text-[#1a1a1a] text-[10px] font-bold">
                {unseenUpdates}
              </span>
            ) : null}
          </button>
          <Link
            href="/build/voice"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/8 border border-glass-border text-xs text-white/75 hover:bg-white/15 hover:text-white transition-colors"
          >
            <Mic className="h-3.5 w-3.5" />
            Hands-free call
          </Link>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/8 border border-glass-border text-xs text-white/75 hover:bg-white/15 hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Start over</span>
          </button>
          <button
            type="button"
            onClick={onFinish}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#1a1a1a] text-xs font-semibold hover:bg-white/90 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Finish & export
          </button>
        </div>
      </header>

      {/* Mobile tab switch — only when the preview is open */}
      {previewOpen ? (
      <div className="md:hidden flex-shrink-0 px-4 pb-2">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white/10 border border-glass-border">
          <button
            type="button"
            onClick={() => setMobileTab("chat")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm transition-colors ${
              mobileTab === "chat" ? "bg-white text-[#1a1a1a] font-medium" : "text-white/70"
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            Chat
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileTab("preview");
              setUnseenUpdates(0);
            }}
            className={`relative flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm transition-colors ${
              mobileTab === "preview" ? "bg-white text-[#1a1a1a] font-medium" : "text-white/70"
            }`}
          >
            <Eye className="h-4 w-4" />
            Preview
            {unseenUpdates > 0 && mobileTab === "chat" ? (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-[#f5b8c8] text-[#1a1a1a] text-[10px] font-bold">
                {unseenUpdates}
              </span>
            ) : null}
          </button>
        </div>
      </div>
      ) : null}

      {/* Split body */}
      <div className="flex-1 flex min-h-0 px-4 md:px-6 pb-4 md:pb-6 gap-4">
        {/* Chat column — fills the width when the preview is closed */}
        <section
          className={`flex-col min-h-0 w-full md:flex ${
            previewOpen ? "md:w-[44%] md:max-w-[560px]" : "md:max-w-[760px] md:mx-auto"
          } ${mobileTab === "chat" ? "flex" : "hidden"}`}
        >
          <div className="flex flex-col min-h-0 flex-1 rounded-3xl bg-glass border border-glass-border backdrop-blur-glass shadow-glow overflow-hidden">
            <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-glass-border">
              <BuildProgress data={resumeData} />
            </div>
            <ChatThread
              messages={messages}
              streaming={streaming}
              className="flex-1 min-h-0 px-4 py-4"
              emptyExtras={emptyExtras}
            />
            <div className="flex-shrink-0 px-3 pb-3 pt-1">
              <ChatComposer
                onSend={handleSend}
                onUpload={handleUpload}
                uploading={uploadingCv}
                disabled={streaming || uploadingCv || fetchingJob}
                placeholder="Reply, paste a job link, or tap 📎 to upload"
                prefill={prefill}
                prefillNonce={prefillNonce}
              />
            </div>
          </div>
        </section>

        {/* Preview column — opt-in (hidden until the user clicks Preview) */}
        {previewOpen ? (
        <section
          className={`flex-1 min-h-0 min-w-0 md:flex ${
            mobileTab === "preview" ? "flex" : "hidden"
          }`}
        >
          <div className="flex-1 min-h-0 min-w-0 flex flex-col gap-2">
            {quickEdits.length > 0 ? (
              <div className="flex-shrink-0 flex items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="inline-flex items-center gap-1 text-[11px] text-white/55 flex-shrink-0">
                  <Pencil className="h-3 w-3" />
                  Quick edit:
                </span>
                {quickEdits.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => quickEdit(q.prompt)}
                    className="flex-shrink-0 px-2.5 py-1 rounded-full bg-white/10 border border-glass-border text-[11px] text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex-shrink-0 self-start inline-flex items-center gap-1 p-1 rounded-full bg-white/10 border border-glass-border">
              <button
                type="button"
                onClick={() => setPreviewView("guided")}
                className={`px-3 py-1 rounded-full text-[12px] transition-colors ${
                  previewView === "guided" ? "bg-white text-[#1a1a1a] font-medium" : "text-white/70 hover:text-white"
                }`}
              >
                Guided
              </button>
              <button
                type="button"
                onClick={() => setPreviewView("document")}
                className={`px-3 py-1 rounded-full text-[12px] transition-colors ${
                  previewView === "document" ? "bg-white text-[#1a1a1a] font-medium" : "text-white/70 hover:text-white"
                }`}
              >
                Document
              </button>
            </div>
            {previewView === "guided" ? (
              <div className="flex-1 min-h-0 rounded-3xl bg-glass border border-glass-border backdrop-blur-glass shadow-glow p-3">
                <GuidedSectionsPreview data={resumeData} />
              </div>
            ) : (
              <div className="flex-1 min-h-0 rounded-3xl bg-white/95 shadow-glow overflow-hidden">
                <SmartResumePreview
                  data={previewData}
                  templateId={selectedTemplate}
                  themeColor={selectedColor}
                  showToolbar={true}
                  onTemplateChange={setSelectedTemplate}
                  onColorChange={setSelectedColor}
                  className="h-full"
                />
              </div>
            )}
          </div>
        </section>
        ) : null}
      </div>
    </div>
  );
}

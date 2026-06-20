"use client";

// Chat-first landing experience. This IS the home page: an anonymous visitor
// lands straight into a conversation that builds their CV live (type, talk, or
// upload). It reuses the exact chat engine behind /build/chat — same
// /api/chat/build stream, same CV tools, same persisted stores — so a session
// started here continues seamlessly after sign-in. The sign-in wall only
// appears at export (and the paid score lives on /score).
//
// The "old way" manual entry points sit at the bottom: Check CV Score, Build
// manually (the step wizard), and Optimize existing (the classic form).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser, SignInButton } from "@clerk/nextjs";
import {
  BarChart3,
  Download,
  Eye,
  ListChecks,
  MessageCircle,
  Sparkles,
  Target,
  UploadCloud,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { useResumeStore } from "@/store/useResumeStore";
import { useChatBuilderStore } from "@/stores/chatBuilderStore";
import { applyCvToolCall, pendingToolLabel } from "@/lib/chat/cvTools";
import { chatGreeting, isPlaceholderSummary } from "@/lib/chat/prompts";
import { readSse } from "@/lib/chat/sse";
import { convertToPreviewData } from "@/lib/resumeDataConverter";
import { generateId } from "@/types/resume";
import { SmartResumePreview } from "@/components/shared/SmartResumePreview";
import { BuilderTemplateId, ThemeColor } from "@/context/BuilderContext";
import { track } from "@/lib/analytics";
import { ChatThread } from "@/components/chat/ChatThread";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { BuildProgress } from "@/components/chat/BuildProgress";
import { GuidedSectionsPreview } from "@/components/chat/GuidedSectionsPreview";

export function HomeChatClient() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const resumeData = useResumeStore((s) => s.resumeData);
  const setResumeData = useResumeStore((s) => s.setResumeData);
  const {
    messages,
    addMessage,
    appendToMessage,
    addToolToMessage,
    resolvePendingTool,
    updateMessage,
  } = useChatBuilderStore();

  const [streaming, setStreaming] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  const [previewView, setPreviewView] = useState<"guided" | "document">("guided");
  const [unseenUpdates, setUnseenUpdates] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<BuilderTemplateId>("ivy-league");
  const [selectedColor, setSelectedColor] = useState<ThemeColor>("indigo");
  const [hydrated, setHydrated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const mobileTabRef = useRef(mobileTab);
  mobileTabRef.current = mobileTab;

  // Seed the greeting once the persisted transcript has hydrated. Returning
  // visitors (who already have a transcript) keep their conversation.
  useEffect(() => {
    setHydrated(true);
    track("home_chat_opened");
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
    addMessage({ id: generateId(), role: "user", content: text, display });
    const assistantId = generateId();
    addMessage({ id: assistantId, role: "assistant", content: "" });
    setStreaming(true);
    track("home_chat_message_sent", { length: text.length });

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
          track("home_chat_tool_applied", { tool: evt.name });
          if (mobileTabRef.current === "chat") setUnseenUpdates((n) => n + 1);
        } else if (evt.type === "resume") {
          setResumeData(evt.resumeData);
        } else if (evt.type === "error") {
          throw new Error(evt.error);
        }
      });
      if (
        toolCount === 0 &&
        !useChatBuilderStore.getState().messages.find((m) => m.id === assistantId)?.content
      ) {
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
      for (let i = 0; i < 25; i++) {
        const msg = useChatBuilderStore.getState().messages.find((m) => m.id === assistantId);
        if (!msg?.tools?.some((t) => t.pending)) break;
        resolvePendingTool(assistantId, null);
      }
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

  function onFinish() {
    track("home_chat_finished", { signedIn: Boolean(isSignedIn) });
    // The CV + transcript live in persisted stores, so the full builder picks
    // up exactly where this left off — after sign-in for anonymous visitors.
    router.push("/builder?step=6&from=chat");
  }

  const previewData = convertToPreviewData(
    isPlaceholderSummary(resumeData.summary) ? { ...resumeData, summary: "" } : resumeData
  );

  const hasCv =
    Boolean(resumeData.personalInfo.name.trim()) || resumeData.experience.length > 0;

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
    </div>
  );

  if (!hydrated) return null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Mobile tab switch — preview only matters once there's content */}
      {hasCv ? (
        <div className="md:hidden flex-shrink-0 pb-2">
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

      {/* Split body: chat (left) + live preview (right) */}
      <div className="flex-1 flex min-h-0 gap-4">
        {/* Chat column */}
        <section
          className={`flex-col min-h-0 w-full ${hasCv ? "md:w-[44%] md:max-w-[560px]" : "md:max-w-[680px] md:mx-auto"} md:flex ${
            mobileTab === "chat" ? "flex" : "hidden"
          }`}
        >
          <div className="flex flex-col min-h-0 flex-1 rounded-3xl bg-glass border border-glass-border backdrop-blur-glass shadow-glow overflow-hidden">
            {hasCv ? (
              <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-glass-border">
                <BuildProgress data={resumeData} />
              </div>
            ) : null}
            <ChatThread
              messages={messages}
              streaming={streaming}
              className="flex-1 min-h-0 px-4 py-4"
              emptyExtras={emptyExtras}
            />
            <div className="flex-shrink-0 px-3 pb-3 pt-1">
              <ChatComposer
                onSend={send}
                onUpload={handleUpload}
                uploading={uploadingCv}
                disabled={streaming || uploadingCv}
              />
            </div>
          </div>
        </section>

        {/* Preview column — appears once the CV has content. Guided accordion
            by default; full document render via the toggle. */}
        {hasCv ? (
          <section
            className={`flex-1 min-h-0 min-w-0 flex-col md:flex ${
              mobileTab === "preview" ? "flex" : "hidden"
            }`}
          >
            <div className="flex-1 min-h-0 min-w-0 flex flex-col gap-2">
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

      {/* Bottom row: finish/export + the manual "old way" entry points */}
      <div className="flex-shrink-0 pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="hidden sm:inline text-[11px] uppercase tracking-[0.18em] text-white/50 mr-1">
            Prefer the old way?
          </span>
          <Link
            href="/score"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/8 border border-glass-border text-xs text-white/80 hover:bg-white/15 hover:text-white transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Check CV Score
          </Link>
          <Link
            href="/builder"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/8 border border-glass-border text-xs text-white/80 hover:bg-white/15 hover:text-white transition-colors"
          >
            <ListChecks className="h-3.5 w-3.5" />
            Build manually
          </Link>
          <Link
            href="/optimize"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/8 border border-glass-border text-xs text-white/80 hover:bg-white/15 hover:text-white transition-colors"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Optimize existing
          </Link>
        </div>

        {hasCv ? (
          isSignedIn ? (
            <button
              type="button"
              onClick={onFinish}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#1a1a1a] text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              <Download className="h-4 w-4" />
              Finish &amp; export
            </button>
          ) : (
            <SignInButton mode="modal" forceRedirectUrl="/build/chat">
              <button className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#1a1a1a] text-sm font-semibold hover:bg-white/90 transition-colors">
                <Sparkles className="h-4 w-4" />
                Save &amp; finish — sign up free
              </button>
            </SignInButton>
          )
        ) : null}
      </div>
    </div>
  );
}

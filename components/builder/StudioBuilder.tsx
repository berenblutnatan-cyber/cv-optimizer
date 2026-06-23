"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useClerk, useUser } from "@clerk/nextjs";
import {
  Clock,
  Contrast,
  Download,
  LayoutTemplate,
  ListChecks,
  Loader2,
  PanelLeft,
  Pencil,
  Plus,
  Redo2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Undo2,
  WandSparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { useResumeStore } from "@/store/useResumeStore";
import { useChatBuilderStore } from "@/stores/chatBuilderStore";
import { applyCvToolCall, pendingToolLabel } from "@/lib/chat/cvTools";
import { chatGreeting, isPlaceholderSummary } from "@/lib/chat/prompts";
import { convertToPreviewData } from "@/lib/resumeDataConverter";
import { generateId, type ResumeData } from "@/types/resume";
import { SmartResumePreview } from "@/components/shared/SmartResumePreview";
import { ResumePreview } from "@/components/builder/ResumePreview";
import { TemplateGalleryModal } from "@/components/builder/TemplateGalleryModal";
import { SAMPLE_RESUME, isEmptyResume } from "@/lib/builder/sampleResume";
import { exportToPdf } from "@/utils/exportToPdf";
import { BuilderTemplateId, ThemeColor } from "@/context/BuilderContext";
import { track } from "@/lib/analytics";
import { readSse } from "@/lib/chat/sse";
import { firstUrl, fetchJobPosting, withJobPosting } from "@/lib/chat/jobUrl";
import { computeProgress } from "@/components/chat/BuildProgress";
import { ChatThread } from "@/components/chat/ChatThread";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { InlineCvEditor } from "@/components/chat/InlineCvEditor";

type ChatListItem = { id: string; title: string; updatedAt: string; messageCount: number };
const ACTIVE_KEY = "chat-active-session-id";

/**
 * StudioBuilder — the single, unified CV builder.
 *
 * One Enhancv-style editor used by BOTH /builder and /build/chat: a persistent
 * AI Assistant chat on the left, the live CV document as the hero on the right,
 * and a clean action toolbar on top. Light + airy, in the Hired navy/gold brand
 * (no glass, no gradient). All the streaming/tool logic is shared with the old
 * chat builder — only the shell changed.
 */
export function StudioBuilder() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { openSignUp } = useClerk();
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
  // Left pane: "chat" (AI builds) or "edit" (tweak fields by hand). Both write
  // the same useResumeStore, so switching never loses work.
  const [leftMode, setLeftMode] = useState<"chat" | "edit">("chat");
  const [chatOpen, setChatOpen] = useState(true);
  const [mobileTab, setMobileTab] = useState<"chat" | "document">("chat");
  const [fetchingJob, setFetchingJob] = useState(false);
  const [prefill, setPrefill] = useState("");
  const [prefillNonce, setPrefillNonce] = useState(0);
  const [unseenUpdates, setUnseenUpdates] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<BuilderTemplateId>("ivy-league");
  const [selectedColor, setSelectedColor] = useState<ThemeColor>("indigo");
  const [docControls, setDocControls] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  sessionIdRef.current = sessionId;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileTabRef = useRef(mobileTab);
  mobileTabRef.current = mobileTab;
  // When an anon user hits the download gate, we open sign-up and remember they
  // were mid-export — so the download resumes itself the moment they're in,
  // instead of making them hunt for the Export button again.
  const pendingExportRef = useRef(false);

  useEffect(() => {
    setHydrated(true);
    track("chat_builder_opened");
    try {
      const saved = localStorage.getItem(ACTIVE_KEY);
      if (saved) {
        setSessionId(saved);
        sessionIdRef.current = saved;
      }
    } catch {
      /* ignore */
    }
    void loadChats();
    if (useChatBuilderStore.getState().messages.some((m) => m.role === "user")) {
      scheduleSave();
    }
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

  // Seamless gate: if a download was blocked on sign-up, run it the instant the
  // user is signed in (their first free credit covers this first CV).
  useEffect(() => {
    if (isSignedIn && pendingExportRef.current) {
      pendingExportRef.current = false;
      void onExport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  async function loadChats() {
    try {
      const res = await fetch("/api/chats");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.chats)) setChats(data.chats as ChatListItem[]);
    } catch {
      /* offline / unauth — keep what we have */
    }
  }

  async function persistSession() {
    const msgs = useChatBuilderStore.getState().messages;
    if (!msgs.some((m) => m.role === "user")) return;
    const payload = {
      messages: msgs.map((m) => ({ role: m.role, content: m.content, display: m.display, tools: m.tools })),
      resume: useResumeStore.getState().resumeData,
    };
    try {
      const id = sessionIdRef.current;
      if (id) {
        await fetch(`/api/chats/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        const res = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const d = await res.json();
          if (d?.id) {
            sessionIdRef.current = d.id;
            setSessionId(d.id);
            try {
              localStorage.setItem(ACTIVE_KEY, d.id);
            } catch {
              /* ignore */
            }
          }
        }
      }
      void loadChats();
    } catch {
      /* keep local copy */
    }
  }

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persistSession(), 800);
  }

  async function send(text: string, display?: string) {
    if (streaming) return;
    const userMsg = { id: generateId(), role: "user" as const, content: text, display };
    addMessage(userMsg);
    const assistantId = generateId();
    addMessage({ id: assistantId, role: "assistant", content: "" });
    setStreaming(true);
    track("chat_message_sent", { length: text.length });

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
          track("chat_tool_applied", { tool: evt.name });
          if (mobileTabRef.current === "chat") setUnseenUpdates((n) => n + 1);
        } else if (evt.type === "resume") {
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
      scheduleSave();
    }
  }

  // Run a toolbar action as a chat instruction, surfacing the chat pane so the
  // user sees the AI respond.
  function runAssistant(text: string, label: string) {
    if (streaming || uploadingCv || fetchingJob) return;
    setLeftMode("chat");
    setChatOpen(true);
    setMobileTab("chat");
    track("studio_toolbar_action", { action: label });
    void send(text);
  }

  function quickEdit(text: string) {
    setLeftMode("chat");
    setChatOpen(true);
    setMobileTab("chat");
    setPrefill(text);
    setPrefillNonce((n) => n + 1);
    track("chat_quick_edit_clicked");
  }

  function switchMode(mode: "chat" | "edit") {
    setLeftMode(mode);
    setChatOpen(true);
    setMobileTab("chat");
    track("chat_builder_mode_switched", { mode });
  }

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

  // One-click PDF export of the live document. Mirrors the rest of the app:
  // sign-in required, then a credit is spent, then the off-screen full-size
  // render is rasterized to a PDF.
  async function onExport() {
    if (isEmpty) {
      toast.message("Add your details first — then export your CV.");
      setLeftMode("chat");
      setMobileTab("chat");
      return;
    }
    if (!isSignedIn) {
      pendingExportRef.current = true;
      toast.message("Your CV's ready — create a free account to download it.", {
        description: "Your first one's on us.",
      });
      openSignUp?.();
      return;
    }
    if (exporting) return;
    setExporting(true);
    track("chat_builder_finished");
    try {
      const credit = await fetch("/api/use-credit", { method: "POST", headers: { "Content-Type": "application/json" } });
      const result = await credit.json().catch(() => ({ success: false }));
      if (!result?.success) {
        toast.error("You're out of credits", { description: "Top up to download — your work is saved." });
        router.push("/pricing");
        return;
      }
      if (!exportRef.current) throw new Error("Nothing to export yet");
      await exportToPdf(exportRef.current, `${(previewData.name || "My").replace(/\s+/g, "-")}-CV`);
      toast.success("Downloaded", { description: "Your CV PDF is in your downloads." });
    } catch (err) {
      toast.error("Export failed", { description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setExporting(false);
    }
  }

  function newChat() {
    abortRef.current?.abort();
    void persistSession();
    clear();
    resetResume();
    setSessionId(null);
    sessionIdRef.current = null;
    try {
      localStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* ignore */
    }
    addMessage({ id: generateId(), role: "assistant", content: chatGreeting(false) });
    setHistoryOpen(false);
    track("chat_new_chat");
  }

  async function openChat(id: string) {
    if (id === sessionIdRef.current) {
      setHistoryOpen(false);
      return;
    }
    void persistSession();
    try {
      const res = await fetch(`/api/chats/${id}`);
      if (!res.ok) {
        toast.error("Couldn't open that chat");
        return;
      }
      const { chat } = await res.json();
      const loaded = (chat.messages ?? []).map(
        (m: { id: string; role: string; content: string; display: string | null; tools: unknown }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          display: m.display ?? undefined,
          tools: (m.tools ?? undefined) as never,
        })
      );
      abortRef.current?.abort();
      useChatBuilderStore.setState({
        messages: loaded.length
          ? loaded
          : [{ id: generateId(), role: "assistant", content: chatGreeting(false) }],
      });
      if (chat.resume) setResumeData(chat.resume as ResumeData);
      else resetResume();
      setSessionId(id);
      sessionIdRef.current = id;
      try {
        localStorage.setItem(ACTIVE_KEY, id);
      } catch {
        /* ignore */
      }
      setHistoryOpen(false);
      track("chat_opened_history");
    } catch {
      toast.error("Couldn't open that chat");
    }
  }

  async function deleteChat(id: string) {
    setChats((list) => list.filter((c) => c.id !== id));
    try {
      await fetch(`/api/chats/${id}`, { method: "DELETE" });
    } catch {
      /* ignore */
    }
    if (id === sessionIdRef.current) newChat();
    else void loadChats();
  }

  const previewData = convertToPreviewData(
    isPlaceholderSummary(resumeData.summary) ? { ...resumeData, summary: "" } : resumeData
  );
  // Until the user has real content, show a polished sample so the document and
  // the template gallery read like a finished CV instead of "YOUR NAME".
  const isEmpty = isEmptyResume(previewData);
  const docData = isEmpty ? SAMPLE_RESUME : previewData;

  const progress = computeProgress(resumeData);
  const pct = Math.round((progress.filter((p) => p.done).length / progress.length) * 100);

  const quickEdits: { label: string; prompt: string }[] = [
    ...(!isPlaceholderSummary(resumeData.summary)
      ? [{ label: "Summary", prompt: "Punch up my summary — " }]
      : []),
    ...(resumeData.experience.length > 0
      ? [{ label: "Experience", prompt: "Strengthen my experience bullets — " }]
      : []),
    ...(resumeData.skills.length > 0 ? [{ label: "Skills", prompt: "Rework my skills list — " }] : []),
    ...(resumeData.education.length > 0 ? [{ label: "Education", prompt: "Update my education — " }] : []),
  ];

  const emptyExtras = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
      <label className="cursor-pointer rounded-2xl bg-white border border-stone-200 hover:border-[#0A2647]/30 hover:shadow-sm transition-all p-3.5 flex items-start gap-3">
        <Download className="h-5 w-5 text-[#0A2647] flex-shrink-0 mt-0.5" />
        <span>
          <span className="block text-sm text-[#1a1a1a] font-medium">Upload my current CV</span>
          <span className="block text-xs text-stone-500 mt-0.5">PDF or Word in, everything pulled into the builder</span>
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
        onClick={() => send("Interview me — ask me what's new and help me build this CV.")}
        className="text-left rounded-2xl bg-white border border-stone-200 hover:border-[#B8860B]/40 hover:shadow-sm transition-all p-3.5 flex items-start gap-3"
      >
        <Sparkles className="h-5 w-5 text-[#B8860B] flex-shrink-0 mt-0.5" />
        <span>
          <span className="block text-sm text-[#1a1a1a] font-medium">Interview me</span>
          <span className="block text-xs text-stone-500 mt-0.5">Not sure what to add? I&apos;ll ask the right questions</span>
        </span>
      </button>
    </div>
  );

  if (!hydrated) return null;

  // A toolbar action button — text label + thin icon, Enhancv-style.
  const ToolBtn = ({
    icon: Icon,
    label,
    onClick,
    badge,
    active,
  }: {
    icon: typeof WandSparkles;
    label: string;
    onClick: () => void;
    badge?: string;
    active?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={streaming}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-colors disabled:opacity-40 ${
        active ? "bg-[#0A2647]/[0.07] text-[#0A2647]" : "text-stone-600 hover:bg-stone-100 hover:text-[#0A2647]"
      }`}
    >
      <Icon className="h-[15px] w-[15px]" strokeWidth={1.8} />
      <span className="hidden lg:inline">{label}</span>
      {badge ? (
        <span className="hidden xl:inline text-[9px] font-bold tracking-wide px-1 py-px rounded bg-[#0A2647]/10 text-[#0A2647]">
          {badge}
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F3F4F6] text-[#1a1a1a]">
      {/* Global top bar */}
      <header className="flex-shrink-0 bg-white border-b border-stone-200">
        <div className="h-14 px-3 sm:px-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Logo variant="dark" size="sm" />
            {!isSignedIn ? (
              <SignUpButton mode="modal">
                <button className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium text-[#B8860B] hover:bg-[#B8860B]/10 transition-colors">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#B8860B]" />
                  Sign up to save your work
                </button>
              </SignUpButton>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/pricing"
              className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-[13px] text-stone-600 hover:bg-stone-100 hover:text-[#0A2647] transition-colors"
            >
              Help
            </Link>
            {isSignedIn ? (
              <UserButton appearance={{ elements: { avatarBox: "w-8 h-8 ring-1 ring-stone-200" } }} />
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className="px-3 py-1.5 rounded-full text-[13px] font-medium text-[#0A2647] border border-stone-300 hover:border-[#0A2647]/40 hover:bg-stone-50 transition-colors">
                    Login
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold bg-[#0A2647] text-white hover:bg-[#0d3259] transition-colors">
                    Sign Up
                  </button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>

        {/* Action toolbar */}
        <div className="h-12 px-2 sm:px-4 flex items-center justify-between gap-2 border-t border-stone-100">
          <div className="flex items-center gap-0.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                setChatOpen((v) => !v);
                setMobileTab("chat");
              }}
              aria-pressed={chatOpen}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                chatOpen ? "bg-[#0A2647]/[0.07] text-[#0A2647]" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <PanelLeft className="h-[15px] w-[15px]" strokeWidth={1.8} />
              <span className="hidden sm:inline">AI Assistant</span>
            </button>
            <span className="mx-1 h-5 w-px bg-stone-200 hidden sm:block" />
            <div className="flex items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <ToolBtn icon={WandSparkles} label="Improve text" onClick={() => runAssistant("Improve the writing across my whole CV — tighten every line, lead with impact, and quantify where you can.", "improve")} />
              <ToolBtn icon={ShieldCheck} label="Check" badge="ATS" onClick={() => runAssistant("Check my CV the way an ATS and a recruiter would. Flag missing keywords, weak bullets and gaps, then fix what you can.", "check")} />
              <ToolBtn icon={ListChecks} label="Rearrange" onClick={() => runAssistant("Reorder my sections and bullets into the strongest order for my target role, most relevant first.", "rearrange")} />
              <ToolBtn icon={LayoutTemplate} label="Templates" active={galleryOpen} onClick={() => { setGalleryOpen(true); setMobileTab("document"); }} />
              <ToolBtn icon={Contrast} label="Design & Font" active={docControls} onClick={() => { setDocControls((v) => !v); setMobileTab("document"); }} />
            </div>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button type="button" disabled aria-label="Undo" className="grid place-items-center h-8 w-8 rounded-lg text-stone-300 cursor-not-allowed">
              <Undo2 className="h-[15px] w-[15px]" strokeWidth={1.8} />
            </button>
            <button type="button" disabled aria-label="Redo" className="grid place-items-center h-8 w-8 rounded-lg text-stone-300 cursor-not-allowed">
              <Redo2 className="h-[15px] w-[15px]" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] text-stone-600 hover:bg-stone-100 hover:text-[#0A2647] transition-colors"
            >
              <Clock className="h-[15px] w-[15px]" strokeWidth={1.8} />
              <span className="hidden md:inline">History</span>
            </button>
            <button
              type="button"
              onClick={onExport}
              disabled={exporting}
              className="ml-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold bg-[#0A2647] text-white hover:bg-[#0d3259] disabled:opacity-60 transition-colors"
            >
              {exporting ? <Loader2 className="h-[15px] w-[15px] animate-spin" /> : <Download className="h-[15px] w-[15px]" strokeWidth={2} />}
              <span className="hidden sm:inline">{exporting ? "Exporting…" : "Export"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile chat/document switch */}
      <div className="md:hidden flex-shrink-0 px-3 py-2 bg-white border-b border-stone-200">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-stone-100">
          <button
            type="button"
            onClick={() => setMobileTab("chat")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm transition-colors ${
              mobileTab === "chat" ? "bg-white text-[#0A2647] font-medium shadow-sm" : "text-stone-500"
            }`}
          >
            <Sparkles className="h-4 w-4" /> Assistant
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileTab("document");
              setUnseenUpdates(0);
            }}
            className={`relative flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm transition-colors ${
              mobileTab === "document" ? "bg-white text-[#0A2647] font-medium shadow-sm" : "text-stone-500"
            }`}
          >
            <LayoutTemplate className="h-4 w-4" /> Document
            {unseenUpdates > 0 && mobileTab === "chat" ? (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-[#B8860B] text-white text-[10px] font-bold">
                {unseenUpdates}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Body: chat pane + document hero */}
      <div className="flex-1 flex min-h-0">
        {/* AI Assistant pane */}
        {chatOpen ? (
          <aside
            className={`flex-col min-h-0 w-full md:w-[380px] lg:w-[420px] md:flex flex-shrink-0 bg-white border-r border-stone-200 ${
              mobileTab === "chat" ? "flex" : "hidden"
            }`}
          >
            <div className="flex-shrink-0 px-4 py-3 border-b border-stone-100">
              <div className="flex items-center justify-between gap-3">
                <div
                  role="tablist"
                  aria-label="Assistant mode"
                  className="inline-flex items-center gap-1 p-1 rounded-full bg-stone-100"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={leftMode === "chat"}
                    onClick={() => switchMode("chat")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12.5px] transition-colors ${
                      leftMode === "chat" ? "bg-white text-[#0A2647] font-semibold shadow-sm" : "text-stone-500 hover:text-stone-700"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Chat
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={leftMode === "edit"}
                    onClick={() => switchMode("edit")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12.5px] transition-colors ${
                      leftMode === "edit" ? "bg-white text-[#0A2647] font-semibold shadow-sm" : "text-stone-500 hover:text-stone-700"
                    }`}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-400 tabular-nums">{pct}%</span>
                  <button
                    type="button"
                    onClick={newChat}
                    aria-label="New chat"
                    className="grid place-items-center h-7 w-7 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-[#0A2647] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2.5 h-1 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full rounded-full bg-[#0A2647] transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {leftMode === "edit" ? (
              <InlineCvEditor />
            ) : (
              <>
                <ChatThread
                  messages={messages}
                  streaming={streaming}
                  theme="light"
                  className="flex-1 min-h-0 px-4 py-4"
                  emptyExtras={emptyExtras}
                />
                <div className="flex-shrink-0 px-3 pb-3 pt-1 border-t border-stone-100">
                  <ChatComposer
                    onSend={handleSend}
                    onUpload={handleUpload}
                    uploading={uploadingCv}
                    disabled={streaming || uploadingCv || fetchingJob}
                    theme="light"
                    chips={[]}
                    placeholder="Reply, paste a job link, or tap 📎 to upload"
                    prefill={prefill}
                    prefillNonce={prefillNonce}
                  />
                </div>
              </>
            )}
          </aside>
        ) : null}

        {/* Document hero */}
        <section
          className={`flex-1 min-h-0 min-w-0 md:flex flex-col ${
            mobileTab === "document" ? "flex" : "hidden"
          }`}
        >
          {quickEdits.length > 0 ? (
            <div className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-white border-b border-stone-200 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="inline-flex items-center gap-1 text-[11px] text-stone-400 flex-shrink-0">
                <Pencil className="h-3 w-3" /> Quick edit:
              </span>
              {quickEdits.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => quickEdit(q.prompt)}
                  className="flex-shrink-0 px-2.5 py-1 rounded-full bg-stone-50 border border-stone-200 text-[11px] text-stone-600 hover:border-[#0A2647]/30 hover:text-[#0A2647] transition-colors"
                >
                  {q.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex-1 min-h-0 min-w-0 bg-stone-100">
            <SmartResumePreview
              data={docData}
              templateId={selectedTemplate}
              themeColor={selectedColor}
              showToolbar={docControls}
              hideTemplateSelector
              onTemplateChange={setSelectedTemplate}
              onColorChange={setSelectedColor}
              className="h-full"
            />
          </div>
        </section>
      </div>

      {/* History drawer */}
      {historyOpen ? (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setHistoryOpen(false)} aria-hidden="true" />
          <div className="relative w-full max-w-sm h-full bg-white border-r border-stone-200 shadow-2xl flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-stone-200">
              <div className="text-sm font-semibold text-[#0A2647]">Your CVs</div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                aria-label="Close history"
                className="grid place-items-center h-8 w-8 rounded-lg text-stone-500 hover:text-[#0A2647] hover:bg-stone-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-shrink-0 px-3 py-3">
              <button
                type="button"
                onClick={newChat}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#0d3259] transition-colors"
              >
                <Plus className="h-4 w-4" /> New CV
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3 space-y-1">
              {chats.length === 0 ? (
                <p className="text-center text-xs text-stone-400 px-4 py-8">
                  No saved CVs yet. Your work saves automatically as you build.
                </p>
              ) : (
                chats.map((c) => (
                  <div
                    key={c.id}
                    className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors ${
                      c.id === sessionId ? "bg-[#0A2647]/[0.06]" : "hover:bg-stone-50"
                    }`}
                  >
                    <button type="button" onClick={() => openChat(c.id)} className="flex-1 min-w-0 text-left">
                      <div className="text-sm text-[#1a1a1a] truncate">{c.title}</div>
                      <div className="text-[11px] text-stone-400">
                        {new Date(c.updatedAt).toLocaleDateString()} · {c.messageCount} msg
                        {c.messageCount === 1 ? "" : "s"}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteChat(c.id)}
                      aria-label="Delete CV"
                      className="flex-shrink-0 grid place-items-center h-7 w-7 rounded-lg text-stone-300 hover:text-rose-500 hover:bg-stone-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Templates gallery (100 presets) */}
      <TemplateGalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        data={docData}
        currentLayout={selectedTemplate}
        currentColor={selectedColor}
        onSelect={(layout, color) => {
          setSelectedTemplate(layout);
          setSelectedColor(color);
          setMobileTab("document");
          track("studio_toolbar_action", { action: "template_select" });
        }}
      />

      {/* Off-screen full-size render — rasterized to PDF on Export. Uses the
          real CV data (never the sample). */}
      <div aria-hidden className="fixed -left-[10000px] top-0 pointer-events-none">
        <div ref={exportRef} style={{ width: 794, background: "#ffffff" }}>
          {!isEmpty ? (
            <ResumePreview data={previewData} templateId={selectedTemplate} themeColor={selectedColor} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

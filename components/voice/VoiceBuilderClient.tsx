"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, Loader2, RotateCw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useResumeStore } from "@/store/useResumeStore";
import { useVoiceSession, type Turn } from "@/hooks/useVoiceSession";
import { applyCvToolCall, describeToolCall } from "@/lib/chat/cvTools";
import { VOICE_OPTIONS, DEFAULT_VOICE, normalizeVoice } from "@/lib/voice/voices";
import { convertToPreviewData } from "@/lib/resumeDataConverter";
import { isPlaceholderSummary } from "@/lib/chat/prompts";
import { SmartResumePreview } from "@/components/shared/SmartResumePreview";
import { GlassCard } from "@/components/shell/GlassCard";
import { track } from "@/lib/analytics";
import { VoiceOrb } from "./VoiceOrb";
import { Transcript } from "./Transcript";
import { VoiceControls } from "./VoiceControls";
import { useT } from "@/lib/i18n/LanguageProvider";

// A finalize call that failed (network blip, server error, out of credits)
// must never cost the user their spoken session. The payload is kept here
// until the server confirms success, and survives a full page reload.
const PENDING_FINALIZE_KEY = "hired_voice_pending_finalize";

type PendingSession = { turns: Turn[]; durationSec: number };

function readPendingFromStorage(): PendingSession | null {
  try {
    const raw = window.localStorage.getItem(PENDING_FINALIZE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { turns?: unknown; durationSec?: unknown };
    if (!Array.isArray(parsed.turns)) return null;
    const turns = parsed.turns.filter(
      (x): x is Turn =>
        !!x &&
        typeof x === "object" &&
        ((x as Turn).role === "user" || (x as Turn).role === "assistant") &&
        typeof (x as Turn).text === "string"
    );
    if (turns.length === 0) return null;
    return {
      turns,
      durationSec: typeof parsed.durationSec === "number" ? parsed.durationSec : 0,
    };
  } catch {
    return null;
  }
}

export function VoiceBuilderClient() {
  const { t } = useT();
  const router = useRouter();
  const resumeData = useResumeStore((s) => s.resumeData);
  const setResumeData = useResumeStore((s) => s.setResumeData);
  const [hydrated, setHydrated] = useState(false);
  // Which voice the bot answers in. Persisted so the user's pick sticks across
  // sessions. Read from localStorage after mount to stay SSR-safe.
  const [voice, setVoice] = useState<string>(DEFAULT_VOICE);
  // A previous session whose finalize failed — kept in state + localStorage
  // until the server confirms it saved, so a flaky connection can't eat it.
  const [pending, setPending] = useState<PendingSession | null>(null);
  const [retrying, setRetrying] = useState(false);
  // Mobile-only live preview sheet. Desktop keeps the side-by-side layout.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDirty, setPreviewDirty] = useState(false);
  const seenToolEventsRef = useRef(0);

  useEffect(() => {
    setHydrated(true);
    try {
      const saved = window.localStorage.getItem("hired_voice");
      if (saved) setVoice(normalizeVoice(saved));
    } catch {
      /* localStorage unavailable — keep default */
    }
    // Restore an unsaved session from a previous visit (failed finalize,
    // credits detour, closed tab mid-retry) so the user can retry saving it.
    setPending(readPendingFromStorage());
  }, []);

  function chooseVoice(id: string) {
    setVoice(id);
    try {
      window.localStorage.setItem("hired_voice", id);
    } catch {
      /* ignore */
    }
    track("voice_voice_changed", { voice: id });
  }

  const {
    state,
    turns,
    toolEvents,
    amplitude,
    error,
    elapsed,
    start,
    stop,
    reset,
    markFinalizing,
    remoteAudioRef,
  } = useVoiceSession({
    onToolCall: (name, input) => {
      // Same pure reducer as the chat builder — the preview updates while
      // the user is still mid-sentence.
      const current = useResumeStore.getState().resumeData;
      const next = applyCvToolCall(current, name, input);
      if (next === current) return null;
      setResumeData(next);
      track("voice_tool_applied", { tool: name });
      return describeToolCall(name, input, t);
    },
  });

  // "CV updated" pulse: when a tool call lands while the mobile sheet is
  // closed, mark the toggle dirty; opening the sheet clears it.
  useEffect(() => {
    if (previewOpen) {
      seenToolEventsRef.current = toolEvents.length;
      setPreviewDirty(false);
      return;
    }
    if (toolEvents.length > seenToolEventsRef.current) setPreviewDirty(true);
  }, [toolEvents.length, previewOpen]);

  // While the sheet is up: freeze background scroll and close on Escape.
  useEffect(() => {
    if (!previewOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [previewOpen]);

  function onOrbClick() {
    if (state === "idle" || state === "error") {
      track("voice_entry_clicked");
      start(voice);
      track("voice_session_started", { voice });
      return;
    }
    // Tapping the orb mid-session = pause/stop the stream.
    stop();
  }

  // Best-effort "abandoned" event: if the page unmounts mid-call without a
  // finalize, surface that signal so we can spot drop-off in PostHog.
  useEffect(() => {
    return () => {
      if (state === "listening" || state === "speaking" || state === "thinking") {
        track("voice_abandoned", { elapsed });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistPending(payload: PendingSession) {
    setPending(payload);
    try {
      window.localStorage.setItem(PENDING_FINALIZE_KEY, JSON.stringify(payload));
    } catch {
      /* localStorage unavailable — component state still holds the copy */
    }
  }

  function clearPending() {
    setPending(null);
    try {
      window.localStorage.removeItem(PENDING_FINALIZE_KEY);
    } catch {
      /* ignore */
    }
  }

  /** Send a session to the server. The payload is persisted before the call
   * and only cleared after a confirmed success, so a failure (or the credits
   * detour) keeps the transcript recoverable. Throws on failure. */
  async function finalize(payload: PendingSession) {
    persistPending(payload);
    const res = await fetch("/api/voice/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turns: payload.turns, durationSec: payload.durationSec }),
    });
    if (res.status === 402) {
      // Out of credits: the session stays persisted, so when they come back
      // from pricing the retry card offers to save it.
      router.push("/pricing?reason=voice_finalize");
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error ?? "Finalize failed");
    }
    const data = await res.json();
    if (!data?.resumeData) {
      throw new Error("No resume data returned");
    }
    clearPending();
    setResumeData(data.resumeData);
    track("voice_finalized", { duration_sec: payload.durationSec });
    toast.success(t("Got it — review your CV below."));
    router.push("/builder?step=6&from=voice");
  }

  async function onDone() {
    if (turns.length === 0) {
      toast.message(t("Talk for a bit first — give us something to work with."));
      return;
    }
    track("voice_session_completed", { duration_sec: elapsed, turns: turns.length });
    markFinalizing();
    stop();
    try {
      await finalize({ turns, durationSec: elapsed });
    } catch (err) {
      track("voice_error", { stage: "finalize" });
      toast.error(err instanceof Error ? err.message : t("Something broke"));
      // Back to idle — the transcript itself is safe in `pending` + storage,
      // and the retry card below offers to save it again.
      reset();
    }
  }

  async function onRetryPending() {
    if (!pending || retrying) return;
    setRetrying(true);
    try {
      await finalize(pending);
    } catch (err) {
      track("voice_error", { stage: "finalize" });
      toast.error(err instanceof Error ? err.message : t("Something broke"));
    } finally {
      setRetrying(false);
    }
  }

  const previewData = convertToPreviewData(
    isPlaceholderSummary(resumeData.summary) ? { ...resumeData, summary: "" } : resumeData
  );

  const selectedVoice = VOICE_OPTIONS.find((v) => v.id === voice);
  const showRetryCard = pending !== null && (state === "idle" || state === "error");
  const answersKept = pending?.turns.filter((x) => x.role === "user").length ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-6 items-start">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Voice column */}
      <div className="space-y-6">
        {showRetryCard ? (
          <GlassCard padding="lg" className="text-center">
            <div className="font-serif italic text-2xl text-white">
              {t("We couldn't save your session")}
            </div>
            <p className="mt-2 text-sm text-white/70">
              {answersKept > 0
                ? `${t("Your answers are safe on this device.")} (${answersKept})`
                : t("Your answers are safe on this device.")}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onRetryPending}
                disabled={retrying}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-full bg-white text-[#1a1a1a] text-sm font-medium shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {retrying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4" />
                )}
                {retrying ? t("Saving…") : t("Retry")}
              </button>
              <button
                type="button"
                onClick={clearPending}
                disabled={retrying}
                className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-full bg-white/10 border border-glass-border text-white/85 text-sm hover:bg-white/15 disabled:opacity-50 transition-colors"
              >
                {t("Discard")}
              </button>
            </div>
          </GlassCard>
        ) : null}

        <div className="flex flex-col items-center gap-6">
          <VoiceOrb state={state} amplitude={amplitude} onClick={onOrbClick} />
          {error ? (
            <div className="text-sm text-[#f5b8c8] max-w-md text-center">{error}</div>
          ) : null}

          {/* Voice picker — only before the call starts; the Realtime API locks
              the voice in at session-creation, so it can't change mid-call. */}
          {state === "idle" || state === "error" ? (
            <div className="w-full max-w-sm">
              <div className="text-center text-[11px] uppercase tracking-[0.18em] text-white/45 mb-2">
                {t("Pick a voice")}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {VOICE_OPTIONS.map((v) => {
                  const active = v.id === voice;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => chooseVoice(v.id)}
                      aria-pressed={active}
                      title={v.blurb}
                      className={
                        active
                          ? "inline-flex items-center min-h-[44px] px-4 py-2 rounded-full text-xs font-medium bg-white text-[#1a1a1a] shadow-glow"
                          : "inline-flex items-center min-h-[44px] px-4 py-2 rounded-full text-xs font-medium bg-white/10 border border-glass-border text-white/80 hover:bg-white/15 transition-colors"
                      }
                    >
                      {t(v.label)}
                    </button>
                  );
                })}
              </div>
              {/* The blurb used to be hover-only (title attr) — invisible on
                  touch. Show the selected voice's blurb inline instead. */}
              {selectedVoice?.blurb ? (
                <p className="mt-2 text-center text-[11px] text-white/55">
                  {t(selectedVoice.blurb)}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <GlassCard padding="lg">
          <Transcript turns={turns} />
          {toolEvents.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {toolEvents.slice(-8).map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-glass-border text-[11px] text-white/85"
                >
                  <Sparkles className="h-3 w-3 text-[#f5b8c8]" />
                  {t.label}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-6">
            <VoiceControls
              state={state}
              elapsed={elapsed}
              hasTurns={turns.length > 0}
              onRestart={reset}
              onDone={onDone}
            />
          </div>
        </GlassCard>

        <div className="text-center text-[11px] text-white/45">
          {t("About 3 minutes · 1 credit on finalize · transcript stays on this device until you confirm")}
        </div>
      </div>

      {/* Live CV preview — builds while they talk, same as the chat builder.
          Desktop: side-by-side. Mobile: bottom-sheet behind the toggle below. */}
      <div className="hidden lg:block rounded-3xl bg-white/95 shadow-glow overflow-hidden h-[78vh] sticky top-6">
        {hydrated ? (
          <SmartResumePreview data={previewData} templateId="ivy-league" className="h-full" />
        ) : null}
      </div>

      {/* Mobile: floating preview toggle, thumb-reachable above the bottom
          dock. Pulses when the CV changed while the sheet was closed. */}
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="lg:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 min-h-[48px] px-5 rounded-full bg-white text-[#1a1a1a] text-sm font-medium shadow-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8fb3ff] focus-visible:ring-offset-2"
      >
        <FileText className="h-4 w-4" />
        {t("Preview CV")}
        {previewDirty ? (
          <>
            <span className="relative flex h-2.5 w-2.5" aria-hidden>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f5b8c8] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#f5b8c8]" />
            </span>
            <span className="sr-only">{t("CV updated")}</span>
          </>
        ) : null}
      </button>

      {/* Mobile bottom-sheet with the live preview */}
      {previewOpen ? (
        <div
          className="lg:hidden fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label={t("Live CV preview")}
        >
          <button
            type="button"
            aria-label={t("Close preview")}
            onClick={() => setPreviewOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-x-0 bottom-0 top-12 rounded-t-3xl bg-white/95 shadow-glow overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between pl-4 pr-2 py-1.5 border-b border-black/10 bg-white">
              <div className="text-sm font-medium text-[#1a1a1a]">{t("Live CV preview")}</div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                aria-label={t("Close preview")}
                className="grid place-items-center h-11 w-11 rounded-full text-[#1a1a1a] hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8fb3ff]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {hydrated ? (
                <SmartResumePreview data={previewData} templateId="ivy-league" className="h-full" />
              ) : null}
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}

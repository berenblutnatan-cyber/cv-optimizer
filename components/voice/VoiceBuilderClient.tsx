"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useResumeStore } from "@/store/useResumeStore";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import { applyCvToolCall, describeToolCall } from "@/lib/chat/cvTools";
import { convertToPreviewData } from "@/lib/resumeDataConverter";
import { isPlaceholderSummary } from "@/lib/chat/prompts";
import { SmartResumePreview } from "@/components/shared/SmartResumePreview";
import { GlassCard } from "@/components/shell/GlassCard";
import { track } from "@/lib/analytics";
import { VoiceOrb } from "./VoiceOrb";
import { Transcript } from "./Transcript";
import { VoiceControls } from "./VoiceControls";
import { useT } from "@/lib/i18n/LanguageProvider";

export function VoiceBuilderClient() {
  const { t } = useT();
  const router = useRouter();
  const resumeData = useResumeStore((s) => s.resumeData);
  const setResumeData = useResumeStore((s) => s.setResumeData);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

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
      return describeToolCall(name, input);
    },
  });

  function onOrbClick() {
    if (state === "idle" || state === "error") {
      track("voice_entry_clicked");
      start();
      track("voice_session_started");
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

  async function onDone() {
    if (turns.length === 0) {
      toast.message(t("Talk for a bit first — give us something to work with."));
      return;
    }
    track("voice_session_completed", { duration_sec: elapsed, turns: turns.length });
    markFinalizing();
    stop();
    try {
      const res = await fetch("/api/voice/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turns, durationSec: elapsed }),
      });
      if (res.status === 402) {
        router.push("/pricing?reason=voice_finalize");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Finalize failed");
      }
      const data = await res.json();
      if (data?.resumeData) {
        setResumeData(data.resumeData);
        track("voice_finalized", { duration_sec: elapsed });
        toast.success(t("Got it — review your CV below."));
        router.push("/builder?step=6&from=voice");
      } else {
        throw new Error("No resume data returned");
      }
    } catch (err) {
      track("voice_error", { stage: "finalize" });
      toast.error(err instanceof Error ? err.message : t("Something broke"));
      reset();
    }
  }

  const previewData = convertToPreviewData(
    isPlaceholderSummary(resumeData.summary) ? { ...resumeData, summary: "" } : resumeData
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-6 items-start">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Voice column */}
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-6">
          <VoiceOrb state={state} amplitude={amplitude} onClick={onOrbClick} />
          {error ? (
            <div className="text-sm text-[#f5b8c8] max-w-md text-center">{error}</div>
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

      {/* Live CV preview — builds while they talk, same as the chat builder */}
      <div className="hidden lg:block rounded-3xl bg-white/95 shadow-glow overflow-hidden h-[78vh] sticky top-6">
        {hydrated ? (
          <SmartResumePreview data={previewData} templateId="ivy-league" className="h-full" />
        ) : null}
      </div>
    </div>
  );
}

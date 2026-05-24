"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useResumeStore } from "@/store/useResumeStore";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import { GlassCard } from "@/components/shell/GlassCard";
import { track } from "@/lib/analytics";
import { VoiceOrb } from "./VoiceOrb";
import { Transcript } from "./Transcript";
import { VoiceControls } from "./VoiceControls";

export function VoiceBuilderClient() {
  const router = useRouter();
  const setResumeData = useResumeStore((s) => s.setResumeData);
  const {
    state,
    turns,
    amplitude,
    error,
    elapsed,
    start,
    stop,
    reset,
    markFinalizing,
    remoteAudioRef,
  } = useVoiceSession();

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
      toast.message("Talk for a bit first — give us something to work with.");
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
        toast.success("Got it — review your CV below.");
        router.push("/builder?step=6&from=voice");
      } else {
        throw new Error("No resume data returned");
      }
    } catch (err) {
      track("voice_error", { stage: "finalize" });
      toast.error(err instanceof Error ? err.message : "Something broke");
      reset();
    }
  }

  return (
    <div className="space-y-8">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="flex flex-col items-center gap-6">
        <VoiceOrb state={state} amplitude={amplitude} onClick={onOrbClick} />
        {error ? (
          <div className="text-sm text-[#f5b8c8] max-w-md text-center">{error}</div>
        ) : null}
      </div>

      <GlassCard padding="lg">
        <Transcript turns={turns} />
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
        About 3 minutes · 1 credit on finalize · transcript stays on this
        device until you confirm
      </div>
    </div>
  );
}

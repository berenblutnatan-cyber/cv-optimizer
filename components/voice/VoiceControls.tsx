"use client";

import { Loader2, RotateCw } from "lucide-react";
import type { VoiceState } from "@/hooks/useVoiceSession";

function formatTimer(s: number) {
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

export function VoiceControls({
  state,
  elapsed,
  hasTurns,
  onRestart,
  onDone,
}: {
  state: VoiceState;
  elapsed: number;
  hasTurns: boolean;
  onRestart: () => void;
  onDone: () => void;
}) {
  const finalizing = state === "finalizing";
  const showDone =
    hasTurns && (state === "listening" || state === "speaking" || state === "thinking");

  return (
    <div className="flex items-center justify-center gap-3 w-full">
      <div className="text-[11px] tabular-nums text-white/55 min-w-[40px] text-right">
        {formatTimer(elapsed)}
      </div>

      <button
        type="button"
        onClick={onRestart}
        disabled={finalizing}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 border border-glass-border text-white/85 text-sm hover:bg-white/15 disabled:opacity-50"
      >
        <RotateCw className="h-3.5 w-3.5" />
        Restart
      </button>

      <button
        type="button"
        onClick={onDone}
        disabled={!showDone || finalizing}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#1a1a1a] text-sm font-medium shadow-glow disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {finalizing ? "Building…" : "I'm done"}
      </button>
    </div>
  );
}

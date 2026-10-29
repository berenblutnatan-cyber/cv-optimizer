"use client";

import * as React from "react";
import { Mic, MicOff, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "./cn";

export type VoiceState = "idle" | "connecting" | "listening" | "speaking" | "muted" | "error";

const LABEL: Record<VoiceState, string> = {
  idle: "Tap to talk",
  connecting: "Connecting",
  listening: "Listening",
  speaking: "Speaking",
  muted: "Muted",
  error: "Mic unavailable",
};

/**
 * The voice control. `level` (0-1) drives the halo from the mic analyser so the
 * user sees they are heard. State is always spoken via aria-live.
 */
export function VoiceOrb({
  state,
  level = 0,
  onClick,
  size = 96,
}: {
  state: VoiceState;
  level?: number;
  onClick?: () => void;
  size?: number;
}) {
  const active = state === "listening" || state === "speaking";
  const halo = 1 + Math.min(1, Math.max(0, level)) * 0.35;
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        aria-label={LABEL[state]}
        className={cn(
          "relative grid place-items-center rounded-full transition-[background-color,box-shadow,transform] duration-panel focus-visible:outline-offset-4",
          state === "idle" && "bg-ink text-canvas hover:scale-[1.03]",
          state === "connecting" && "bg-surface-2 text-ink-2",
          state === "listening" && "bg-accent text-on-accent",
          state === "speaking" && "bg-ink text-canvas",
          state === "muted" && "bg-surface-2 text-ink-3",
          state === "error" && "bg-danger-wash text-danger",
        )}
        style={{ width: size, height: size }}
      >
        {active && (
          <span
            aria-hidden
            className={cn("absolute inset-0 rounded-full transition-transform duration-100", state === "listening" ? "bg-accent/25" : "bg-ink/15 animate-breathe")}
            style={state === "listening" ? { transform: `scale(${halo})` } : undefined}
          />
        )}
        <span className="relative [&_svg]:size-7">
          {state === "connecting" ? <Loader2 className="animate-spin" /> : state === "muted" ? <MicOff /> : state === "error" ? <AlertTriangle /> : <Mic />}
        </span>
      </button>
      <span aria-live="polite" className="text-body font-medium text-ink-2">
        {LABEL[state]}
      </span>
    </div>
  );
}

/** Live input waveform: bars from getInputByteFrequencyData (0-255). */
export function Waveform({ data, bars = 28, className }: { data?: Uint8Array | number[]; bars?: number; className?: string }) {
  const values = React.useMemo(() => {
    if (!data || data.length === 0) return Array.from({ length: bars }, () => 0.06);
    const step = Math.max(1, Math.floor(data.length / bars));
    return Array.from({ length: bars }, (_, i) => Math.max(0.06, (data[i * step] ?? 0) / 255));
  }, [data, bars]);
  return (
    <div aria-hidden className={cn("flex h-10 items-center gap-[3px]", className)}>
      {values.map((v, i) => (
        <span key={i} className="w-[3px] rounded-full bg-ink-3 transition-[height] duration-100" style={{ height: `${Math.round(v * 100)}%` }} />
      ))}
    </div>
  );
}

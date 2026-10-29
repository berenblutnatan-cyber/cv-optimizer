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
 * user sees they are heard. Without `onClick` it is a status display, not a
 * button. `announce` speaks state changes via aria-live (off during a call,
 * where it would interrupt every turn).
 */
export function VoiceOrb({
  state,
  level = 0,
  onClick,
  size = 96,
  label,
  actionLabel,
  announce = true,
}: {
  state: VoiceState;
  level?: number;
  onClick?: () => void;
  size?: number;
  /** Visible label; defaults to the state name. */
  label?: string;
  /** Accessible name of the button when it does something other than the label says. */
  actionLabel?: string;
  announce?: boolean;
}) {
  const active = state === "listening" || state === "speaking";
  const halo = 1 + Math.min(1, Math.max(0, level)) * 0.35;
  const text = label ?? LABEL[state];
  const className = cn(
    "relative grid place-items-center rounded-full transition-[background-color,box-shadow,transform] duration-panel focus-visible:outline-offset-4",
    state === "idle" && "bg-ink text-canvas hover:scale-[1.03]",
    state === "connecting" && "bg-surface-2 text-ink-2",
    state === "listening" && "bg-accent text-on-accent",
    state === "speaking" && "bg-ink text-canvas",
    state === "muted" && "bg-surface-2 text-ink-3",
    state === "error" && "bg-danger-wash text-danger",
  );
  const inner = (
    <>
      {active && (
        <span
          aria-hidden
          className={cn("absolute inset-0 rounded-full transition-transform duration-100", state === "listening" ? "bg-accent/25" : "bg-ink/15 animate-breathe")}
          style={state === "listening" ? { transform: `scale(${halo})` } : undefined}
        />
      )}
      <span className="relative [&_svg]:size-7" aria-hidden>
        {state === "connecting" ? <Loader2 className="animate-spin" /> : state === "muted" ? <MicOff /> : state === "error" ? <AlertTriangle /> : <Mic />}
      </span>
    </>
  );
  return (
    <div className="flex flex-col items-center gap-3">
      {onClick ? (
        <button type="button" onClick={onClick} aria-label={actionLabel ?? text} className={className} style={{ width: size, height: size }}>
          {inner}
        </button>
      ) : (
        <div aria-hidden className={className} style={{ width: size, height: size }}>
          {inner}
        </div>
      )}
      <span aria-live={announce ? "polite" : "off"} className="text-body font-medium text-ink-2">
        {text}
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
        // Scaled, not resized: transform stays on the compositor at 15 updates a second.
        <span key={i} className="h-full w-[3px] origin-center rounded-full bg-ink-3 transition-transform duration-100" style={{ transform: `scaleY(${v.toFixed(2)})` }} />
      ))}
    </div>
  );
}

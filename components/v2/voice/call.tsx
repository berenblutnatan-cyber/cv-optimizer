"use client";

import * as React from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { VoiceOrb, Waveform, type VoiceState } from "@/components/ui";

// The parts of a live ElevenLabs call shared by Talk mode (CV intake) and
// interview practice: one connection per attempt, the mic visuals, and the
// small helpers both screens use. Each screen owns its own phases.

/** A single-use connection: the token and the agent's dynamic variables. */
export type CallConn = { token: string; variables: Record<string, string> };
export type ClientTools = Record<string, (params: unknown) => string | void>;
export type CallControls = { end: () => void; nudge: (text: string) => void; level: () => number; freq: () => Uint8Array };

/** The SDK surface Talk mode uses. Injectable so the call UI can be exercised without a live agent. */
export type VoiceSdk = { Provider: React.ComponentType<{ children?: React.ReactNode }>; useConversation: typeof useConversation };
export const ELEVENLABS: VoiceSdk = { Provider: ConversationProvider, useConversation };

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

/** One line telling the user where their browser hides the microphone switch. */
export function micHelp(): string {
  if (typeof navigator === "undefined") return "Allow the microphone for this site, then try again.";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "Settings › Apps › Safari › Microphone › Allow, then try again.";
  if (/Firefox\//.test(ua)) return "Click the microphone icon in the address bar, allow it, then try again.";
  if (/Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) return "Safari › Settings for This Website › Microphone › Allow, then try again.";
  return "Click the icon left of the address bar › Microphone › Allow, then try again.";
}

export async function postJson(url: string, body?: unknown, init?: RequestInit) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), ...init });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json: json as Record<string, unknown> | null };
}

/** Ask for the mic inside the click (iOS needs the gesture), before anything is charged. */
export async function askMic(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

/** One live ElevenLabs connection. Starts on mount, reports up, never decides what happens next. */
export function Connection<C extends CallConn>({
  sdk,
  conn,
  clientTools,
  muted,
  controlsRef,
  onConnected,
  onLine,
  onDropped,
  onMode,
}: {
  sdk: VoiceSdk;
  conn: C;
  /** The agent's client tools for this connection; read once, when it starts. */
  clientTools: () => ClientTools;
  muted: boolean;
  controlsRef: React.MutableRefObject<CallControls | null>;
  onConnected: (conversationId: string) => void;
  onLine: (kind: "user" | "agent", text: string) => void;
  onDropped: (error: string | null) => void;
  onMode: (speaking: boolean) => void;
}) {
  const conversation = sdk.useConversation({ micMuted: muted });
  const endedByUs = React.useRef(false);
  const live = React.useRef(conversation);
  live.current = conversation;
  const cb = React.useRef({ onConnected, onLine, onDropped, onMode });
  cb.current = { onConnected, onLine, onDropped, onMode };

  // Start on mount, end on unmount: the connection lives exactly as long as
  // `conn` (one attempt). The start is deferred a tick so React's dev
  // double-mount cancels it before it runs: the token is single-use.
  const tools = React.useRef(clientTools);
  tools.current = clientTools;
  React.useEffect(() => {
    endedByUs.current = false;
    let started = false;
    const timer = setTimeout(() => {
      started = true;
      live.current.startSession({
        conversationToken: conn.token,
        connectionType: "webrtc",
        dynamicVariables: conn.variables,
        clientTools: tools.current(),
        onConnect: ({ conversationId }) => cb.current.onConnected(conversationId),
        onMessage: (m) => {
          const text = m.message?.trim();
          if (text) cb.current.onLine(m.source === "user" ? "user" : "agent", text);
        },
        onModeChange: ({ mode }) => cb.current.onMode(mode === "speaking"),
        onError: (message) => console.error("[voice] sdk error", message),
        onDisconnect: (details) => {
          if (endedByUs.current || details.reason === "user") return cb.current.onDropped(null);
          cb.current.onDropped(details.reason === "error" ? details.message || "Connection lost" : "agent");
        },
      });
    }, 0);
    return () => {
      clearTimeout(timer);
      if (!started) return;
      // Unmounting mid-call (end, reconnect, navigating away): close it so the minutes stop.
      endedByUs.current = true;
      try {
        live.current.endSession();
      } catch {}
    };
  }, [conn]);

  React.useEffect(() => {
    controlsRef.current = {
      end: () => {
        endedByUs.current = true;
        live.current.endSession();
      },
      nudge: (text) => live.current.sendContextualUpdate(text),
      level: () => (live.current.isSpeaking ? live.current.getOutputVolume() : live.current.getInputVolume()),
      freq: () => live.current.getInputByteFrequencyData(),
    };
  }, [controlsRef]);

  return null;
}

/** Live mic visuals, sampled on animation frames (no React state churn at 60fps). */
export function LiveOrb({
  state,
  controlsRef,
  muted,
  onToggleMute,
}: {
  state: VoiceState;
  controlsRef: React.MutableRefObject<{ level: () => number; freq: () => Uint8Array } | null>;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const [level, setLevel] = React.useState(0);
  const [freq, setFreq] = React.useState<Uint8Array | undefined>();
  React.useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 66) return;
      last = t;
      const c = controlsRef.current;
      if (!c) return;
      try {
        setLevel(c.level());
        setFreq(new Uint8Array(c.freq()));
      } catch {}
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [controlsRef]);
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Tapping the orb mutes: it is a control, never a push-to-talk button. Its state isn't announced every turn. */}
      <VoiceOrb state={state} level={level} size={88} announce={false} onClick={onToggleMute} actionLabel={muted ? "Unmute" : "Mute"} />
      <Waveform data={state === "listening" ? freq : undefined} className="w-40" />
    </div>
  );
}

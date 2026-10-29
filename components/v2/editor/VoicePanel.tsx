"use client";

import * as React from "react";
import Link from "next/link";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Check, Copy, CreditCard, Info, LogIn, MessageSquare, Mic, MicOff, PhoneOff, RotateCw } from "lucide-react";
import type { ResumeDocument } from "@/lib/resume/document";
import { VoiceToolBridge } from "@/lib/voice/bridge";
import { readVoiceSupport } from "@/lib/voice/support";
import { Badge, Button, cn, EmptyState, IconButton, Skeleton, toast, Tooltip, VoiceOrb, Waveform, type VoiceState } from "@/components/ui";

// Talk mode: an ElevenLabs agent interviews the user and edits the CV through
// the same save queue as typing (see lib/voice/protocol.ts for the contract).
// Each connection attempt mounts its own ConversationProvider, so a dropped
// or errored SDK state never leaks into the reconnect.

/** The SDK surface Talk mode uses. Injectable so the call UI can be exercised without a live agent. */
export type VoiceSdk = { Provider: React.ComponentType<{ children?: React.ReactNode }>; useConversation: typeof useConversation };
const ELEVENLABS: VoiceSdk = { Provider: ConversationProvider, useConversation };

type Offer = { free: boolean; credits: number; seconds: number; unlimited: boolean; balance: number; available: boolean };
type Conn = { sessionId: string; attempt: number; token: string; variables: Record<string, string> };
type Line = { id: number; kind: "user" | "agent" | "edit"; text: string };
type Phase =
  | { name: "idle" }
  | { name: "starting" }
  | { name: "live" }
  | { name: "reconnecting" }
  | { name: "ending" }
  | { name: "done"; versionNumber: number | null; edits: number }
  | { name: "blocked"; reason: "signed_out" | "no_credits" | "unavailable" | "mic_denied" | "unsupported" | "in_app" | "busy" | "error"; message?: string };

const MAX_RECONNECTS = 3;
const WRAP_UP_AT = 30;
const HIDDEN_END_MS = 60_000;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

function priceLabel(o: Offer): { label: string; tip: string } {
  const minutes = Math.round(o.seconds / 60);
  const refund = "Under 20 seconds is free.";
  if (o.free) return { label: `Free · ${minutes} min`, tip: `Your first call is free. ${refund}` };
  if (o.unlimited) return { label: `Unlimited · ${minutes} min`, tip: `Included in Unlimited. ${refund}` };
  return { label: `1 credit · ${minutes} min`, tip: `You have ${o.balance} ${o.balance === 1 ? "credit" : "credits"}. ${refund}` };
}

async function postJson(url: string, body?: unknown, init?: RequestInit) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), ...init });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json: json as Record<string, unknown> | null };
}

/** One live ElevenLabs connection. Starts on mount, reports up, never decides what happens next. */
function Connection({
  sdk,
  conn,
  bridge,
  muted,
  controlsRef,
  onConnected,
  onLine,
  onDropped,
  onMode,
}: {
  sdk: VoiceSdk;
  conn: Conn;
  bridge: VoiceToolBridge;
  muted: boolean;
  controlsRef: React.MutableRefObject<{ end: () => void; nudge: (text: string) => void; level: () => number; freq: () => Uint8Array } | null>;
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
  const tools = React.useRef(bridge);
  tools.current = bridge;
  React.useEffect(() => {
    endedByUs.current = false;
    let started = false;
    const timer = setTimeout(() => {
      started = true;
      live.current.startSession({
        conversationToken: conn.token,
        connectionType: "webrtc",
        dynamicVariables: conn.variables,
        clientTools: tools.current.clientTools(),
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
function LiveOrb({ state, controlsRef }: { state: VoiceState; controlsRef: React.MutableRefObject<{ level: () => number; freq: () => Uint8Array } | null> }) {
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
      <VoiceOrb state={state} level={level} size={88} />
      <Waveform data={state === "listening" ? freq : undefined} className="w-40" />
    </div>
  );
}

export function VoicePanel({
  cvId,
  signedIn,
  applyVoice,
  getDoc,
  settle,
  onEdit,
  onUseChat,
  onKeepEditing,
  sdk = ELEVENLABS,
}: {
  cvId: string;
  signedIn: boolean;
  applyVoice: (name: string, input: Record<string, unknown>, clientOpId: string, voiceSessionId: string) => boolean;
  getDoc: () => ResumeDocument;
  settle: () => Promise<boolean>;
  onEdit: () => void;
  onUseChat: () => void;
  onKeepEditing: () => void;
  sdk?: VoiceSdk;
}) {
  const [phase, setPhaseState] = React.useState<Phase>(signedIn ? { name: "idle" } : { name: "blocked", reason: "signed_out" });
  const [offer, setOffer] = React.useState<Offer | null>(null);
  const [conn, setConn] = React.useState<Conn | null>(null);
  const [lines, setLines] = React.useState<Line[]>([]);
  const [muted, setMuted] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const [connected, setConnected] = React.useState(false);
  const [left, setLeft] = React.useState<number | null>(null);
  const controlsRef = React.useRef<{ end: () => void; nudge: (text: string) => void; level: () => number; freq: () => Uint8Array } | null>(null);
  const deadline = React.useRef<number | null>(null);
  const reconnects = React.useRef(0);
  const nudged = React.useRef(false);
  const lineId = React.useRef(0);
  // SDK callbacks fire synchronously inside our own calls (endSession → onDisconnect),
  // so the phase they read must change the moment we change it, not on the next render.
  const phaseRef = React.useRef(phase);
  const setPhase = React.useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);
  const finishing = React.useRef<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const addLine = React.useCallback((kind: Line["kind"], text: string) => {
    setLines((ls) => [...ls.slice(-80), { id: ++lineId.current, kind, text }]);
  }, []);

  // A browser that can't take the call is told up front, before the Talk button.
  React.useEffect(() => {
    const s = readVoiceSupport();
    if (s !== "ok" && signedIn) setPhase({ name: "blocked", reason: s });
  }, [signedIn]);

  const loadOffer = React.useCallback(async () => {
    const r = await fetch("/api/voice/sessions", { cache: "no-store" }).catch(() => null);
    if (!r) return;
    if (r.status === 401) return setPhase({ name: "blocked", reason: "signed_out" });
    if (!r.ok) return;
    const o: Offer = await r.json();
    setOffer(o);
    // Not configured or switched off: say so instead of offering a dead button.
    if (!o.available && phaseRef.current.name === "idle") setPhase({ name: "blocked", reason: "unavailable" });
  }, [setPhase]);
  React.useEffect(() => {
    if (signedIn) void loadOffer();
  }, [signedIn, loadOffer]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  // One bridge per connection, for its whole life: its numbering must never
  // restart mid-call. It reaches the editor through a ref, so a re-render
  // (every edit causes one) can't replace it or the connection under it.
  const editor = React.useRef({ applyVoice, getDoc, onEdit, addLine });
  editor.current = { applyVoice, getDoc, onEdit, addLine };
  const bridge = React.useMemo(
    () =>
      conn
        ? new VoiceToolBridge(conn.sessionId, conn.attempt, {
            applyVoice: (...args) => editor.current.applyVoice(...args),
            getDoc: () => editor.current.getDoc(),
            onEdit: (label) => {
              editor.current.addLine("edit", label);
              editor.current.onEdit();
            },
          })
        : null,
    [conn],
  );

  const finish = React.useCallback(
    async (sessionId: string) => {
      // Once per session, however many paths (End, timer, agent hang-up, hidden tab) race here.
      if (finishing.current === sessionId) return;
      finishing.current = sessionId;
      setPhase({ name: "ending" });
      controlsRef.current?.end();
      controlsRef.current = null;
      setConn(null);
      setConnected(false);
      deadline.current = null;
      setLeft(null);
      // Every edit from the call is saved before the version is cut.
      const saved = await settle();
      // A failed end call loses nothing: the edits are saved, and the cron closes the session.
      const r = await postJson(`/api/voice/sessions/${sessionId}/end`).catch(() => null);
      if (!saved) toast.error("Some edits aren't saved yet. They'll retry.");
      const edits = Number(r?.json?.edits ?? 0);
      setPhase({ name: "done", versionNumber: typeof r?.json?.versionNumber === "number" ? r.json.versionNumber : null, edits: r ? edits : 1 });
      void loadOffer();
    },
    [settle, loadOffer, setPhase],
  );

  const sessionRef = React.useRef<string | null>(null);

  const start = async () => {
    const s = readVoiceSupport();
    if (s !== "ok") return setPhase({ name: "blocked", reason: s });
    setPhase({ name: "starting" });
    setLines([]);
    // Ask for the mic inside the click (iOS needs the gesture), before anything is charged.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      return setPhase({ name: "blocked", reason: "mic_denied" });
    }
    const r = await postJson("/api/voice/sessions", { cvId }).catch(() => null);
    if (!r || !r.ok) {
      const code = r?.json?.code;
      const reason =
        r?.status === 401 ? "signed_out" : r?.status === 402 ? "no_credits" : r?.status === 409 ? "busy" : r?.status === 503 || code === "UNAVAILABLE" ? "unavailable" : "error";
      return setPhase({ name: "blocked", reason, message: typeof r?.json?.error === "string" ? r.json.error : undefined });
    }
    const j = r.json as { sessionId: string; attempt: number; token: string; seconds: number; variables: Record<string, string> };
    sessionRef.current = j.sessionId;
    finishing.current = null;
    reconnects.current = 0;
    nudged.current = false;
    deadline.current = Date.now() + j.seconds * 1000;
    setLeft(j.seconds);
    setConn({ sessionId: j.sessionId, attempt: j.attempt, token: j.token, variables: j.variables });
    setPhase({ name: "live" });
  };

  const reconnect = React.useCallback(
    async (sessionId: string) => {
      setConnected(false);
      setConn(null);
      if (reconnects.current >= MAX_RECONNECTS) return finish(sessionId);
      reconnects.current += 1;
      setPhase({ name: "reconnecting" });
      // A short pause: an immediate retry usually hits the same broken network.
      await new Promise((res) => setTimeout(res, 800 * reconnects.current));
      if (phaseRef.current.name !== "reconnecting" || finishing.current === sessionId) return;
      const r = await postJson(`/api/voice/sessions/${sessionId}/token`).catch(() => null);
      if (!r?.ok) return finish(sessionId);
      const j = r.json as { attempt: number; token: string; seconds: number; variables: Record<string, string> };
      deadline.current = Date.now() + j.seconds * 1000;
      setConn({ sessionId, attempt: j.attempt, token: j.token, variables: j.variables });
      setPhase({ name: "live" });
    },
    [finish, setPhase],
  );

  // The clock: warn the agent near the end, hang up at zero.
  React.useEffect(() => {
    if (phase.name !== "live") return;
    const id = setInterval(() => {
      if (!deadline.current || !sessionRef.current) return;
      const s = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setLeft(s);
      if (s <= WRAP_UP_AT && !nudged.current) {
        nudged.current = true;
        controlsRef.current?.nudge("About 30 seconds left in this call. Wrap up now in one or two sentences.");
      }
      if (s === 0) void finish(sessionRef.current);
    }, 250);
    return () => clearInterval(id);
  }, [phase.name, finish]);

  // A call left running in a hidden tab ends after a minute (and on page close).
  React.useEffect(() => {
    if (phase.name !== "live" && phase.name !== "reconnecting") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onVis = () => {
      if (document.visibilityState === "hidden") timer = setTimeout(() => sessionRef.current && void finish(sessionRef.current), HIDDEN_END_MS);
      else if (timer) clearTimeout(timer);
    };
    const onHide = () => {
      // Best effort: the page is going away. The cron closes it otherwise.
      if (sessionRef.current) fetch(`/api/voice/sessions/${sessionRef.current}/end`, { method: "POST", keepalive: true }).catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
    };
  }, [phase.name, finish]);

  const onConnected = React.useCallback(
    (conversationId: string) => {
      setConnected(true);
      const c = conn;
      // If this is lost, the webhook still finds the call by its session variables.
      if (c) postJson(`/api/voice/sessions/${c.sessionId}/connect`, { attempt: c.attempt, conversationId }).catch(() => {});
    },
    [conn],
  );

  const onDropped = React.useCallback(
    (error: string | null) => {
      const sid = sessionRef.current;
      if (!sid || phaseRef.current.name !== "live" || finishing.current === sid) return;
      // The agent hung up (it ran out of time, or the user said goodbye): that's the end.
      if (error === null || error === "agent") return void finish(sid);
      void reconnect(sid);
    },
    [finish, reconnect],
  );

  const orbState: VoiceState = !connected ? "connecting" : muted ? "muted" : speaking ? "speaking" : "listening";
  const price = offer ? priceLabel(offer) : null;
  const signInHref = `/sign-in?redirect_url=${encodeURIComponent(`/cv/${cvId}?talk=1`)}`;

  if (phase.name === "blocked") {
    const retry = (
      <Button variant="secondary" onClick={() => setPhase({ name: "idle" })}>
        <RotateCw /> Try again
      </Button>
    );
    const view: Record<typeof phase.reason, { icon: React.ReactNode; title: string; action: React.ReactNode; tip?: string }> = {
      signed_out: {
        icon: <Mic />,
        title: "Sign in to talk",
        action: (
          <Button asChild variant="primary">
            <a href={signInHref}>
              <LogIn /> Sign in
            </a>
          </Button>
        ),
        tip: "Your first call is free.",
      },
      no_credits: {
        icon: <CreditCard />,
        title: "Out of credits",
        action: (
          <Button asChild variant="primary">
            <Link href="/pricing">Add credits</Link>
          </Button>
        ),
      },
      unavailable: {
        icon: <MicOff />,
        title: phase.message ?? "Voice isn't available right now",
        action: (
          <Button variant="secondary" onClick={onUseChat}>
            <MessageSquare /> Use chat
          </Button>
        ),
      },
      mic_denied: { icon: <MicOff />, title: "Microphone blocked", action: retry, tip: "Allow the microphone for this site in your browser's settings, then try again." },
      unsupported: {
        icon: <MicOff />,
        title: "This browser can't use the mic",
        action: (
          <Button variant="secondary" onClick={onUseChat}>
            <MessageSquare /> Use chat
          </Button>
        ),
        tip: "Try Chrome, Edge or Safari.",
      },
      in_app: {
        icon: <MicOff />,
        title: "Open in Safari or Chrome",
        action: (
          <Button
            variant="primary"
            onClick={() => {
              void navigator.clipboard?.writeText(window.location.href).then(() => toast("Link copied"));
            }}
          >
            <Copy /> Copy link
          </Button>
        ),
        tip: "In-app browsers block the microphone.",
      },
      busy: { icon: <Mic />, title: "You're already in a call", action: retry, tip: "End the call in your other tab, or wait a few minutes." },
      error: { icon: <MicOff />, title: phase.message ?? "Couldn't start the call", action: retry },
    };
    const v = view[phase.reason];
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={v.icon}
          title={v.title}
          action={
            <div className="flex items-center gap-2">
              {v.action}
              {v.tip && (
                <Tooltip content={v.tip}>
                  <span tabIndex={0} aria-label={v.tip} className="grid size-9 place-items-center rounded-control text-ink-3 hover:text-ink">
                    <Info className="size-4" />
                  </span>
                </Tooltip>
              )}
            </div>
          }
        />
      </div>
    );
  }

  if (phase.name === "idle" || phase.name === "starting") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 px-6">
        <VoiceOrb state={phase.name === "starting" ? "connecting" : "idle"} onClick={phase.name === "starting" ? undefined : () => void start()} size={96} />
        <div className="h-7">
          {price ? (
            <Tooltip content={price.tip}>
              <span tabIndex={0}>
                <Badge tone={offer?.free ? "accent" : "neutral"}>{price.label}</Badge>
              </span>
            </Tooltip>
          ) : (
            <Skeleton className="h-7 w-28 rounded-full" />
          )}
        </div>
      </div>
    );
  }

  if (phase.name === "done") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center animate-fade-in">
        <span className="grid size-12 place-items-center rounded-full bg-success-wash text-success">
          <Check className="size-6" />
        </span>
        <p className="text-h3 font-semibold text-ink">
          {phase.edits === 0 ? "Call ended" : phase.versionNumber ? `Saved as v${phase.versionNumber}` : "Saved"}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={onKeepEditing}>
            Keep editing
          </Button>
          <Button variant="ghost" onClick={() => setPhase({ name: "idle" })}>
            <Mic /> Talk again
          </Button>
        </div>
      </div>
    );
  }

  // live | reconnecting | ending
  const sid = sessionRef.current;
  const low = left !== null && left <= 60;
  return (
    <div className="flex h-full min-h-0 flex-col">
      {conn && bridge && (
        <sdk.Provider key={`${conn.sessionId}:${conn.attempt}`}>
          <Connection
            sdk={sdk}
            conn={conn}
            bridge={bridge}
            muted={muted}
            controlsRef={controlsRef}
            onConnected={onConnected}
            onLine={addLine}
            onDropped={onDropped}
            onMode={setSpeaking}
          />
        </sdk.Provider>
      )}
      <div className="flex h-13 shrink-0 items-center gap-2 border-b border-hairline px-3">
        <span role="timer" aria-label={left === null ? "Time left" : `${fmt(left)} left`} className={cn("tabular text-body font-medium", low ? "text-warn" : "text-ink-2")}>
          {left === null ? "–:––" : fmt(left)}
        </span>
        <div className="ms-auto flex items-center gap-1">
          <IconButton label={muted ? "Unmute" : "Mute"} active={muted} disabled={phase.name !== "live"} onClick={() => setMuted((m) => !m)}>
            {muted ? <MicOff /> : <Mic />}
          </IconButton>
          <Button size="sm" variant="danger" loading={phase.name === "ending"} disabled={!sid} onClick={() => sid && void finish(sid)}>
            <PhoneOff /> End
          </Button>
        </div>
      </div>
      <div className="flex shrink-0 justify-center py-8">
        {phase.name === "live" ? (
          <LiveOrb state={orbState} controlsRef={controlsRef} />
        ) : (
          <VoiceOrb state="connecting" size={88} />
        )}
      </div>
      {phase.name !== "live" && (
        <p role="status" className="-mt-4 mb-4 text-center text-body text-ink-2">
          {phase.name === "reconnecting" ? "Reconnecting…" : "Saving…"}
        </p>
      )}
      <div ref={scrollRef} aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-6">
        {lines.map((l) =>
          l.kind === "edit" ? (
            <div key={l.id} className="flex items-center gap-2 text-dense font-medium text-success animate-fade-in">
              <Check className="size-4 shrink-0" /> {l.text}
            </div>
          ) : l.kind === "user" ? (
            <p key={l.id} className="ms-auto w-fit max-w-[85%] rounded-card bg-surface-2 px-3 py-2 text-body text-ink animate-fade-in">
              <span className="sr-only">You: </span>
              {l.text}
            </p>
          ) : (
            <p key={l.id} className="max-w-[92%] text-body text-ink-2 animate-fade-in">
              <span className="sr-only">Hired: </span>
              {l.text}
            </p>
          ),
        )}
      </div>
    </div>
  );
}

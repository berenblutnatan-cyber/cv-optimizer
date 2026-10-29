"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Copy, Info, Mic, MicOff, PhoneOff, RotateCw, Send } from "lucide-react";
import type { PublicInterview } from "@/lib/interview/store";
import { BEGIN_QUESTION_TOOL, INTERVIEW } from "@/lib/interview/types";
import { readVoiceSupport } from "@/lib/voice/support";
import { Badge, Button, cn, EmptyState, IconButton, Progress, Skeleton, Textarea, toast, Tooltip, VoiceOrb, type VoiceState } from "@/components/ui";
import { askMic, Connection, ELEVENLABS, fmt, LiveOrb, micHelp, postJson, type CallControls, type CallConn, type VoiceSdk } from "@/components/v2/voice/call";
import { Debrief } from "./Debrief";

// One practice session, start to debrief. Voice: an ElevenLabs interviewer
// asks the questions and marks each with begin_question, so the screen shows
// the question being asked. Text: one question at a time, typed. Either way
// the server scores it and the debrief replaces the room.

type Conn = CallConn & { attempt: number };
type Phase =
  | { name: "voice-ready" }
  | { name: "starting" }
  | { name: "live" }
  | { name: "reconnecting" }
  | { name: "ending" }
  | { name: "text" }
  | { name: "scoring"; slow?: boolean }
  | { name: "done" }
  | { name: "failed" }
  | { name: "blocked"; reason: "mic_denied" | "unsupported" | "in_app" | "unavailable" | "expired" | "error"; message?: string };

const MAX_RECONNECTS = 3;
const WRAP_UP_AT = 30;
const HIDDEN_END_MS = 60_000;
const POLL_MS = 3000;
const SLOW_AFTER_MS = 4 * 60_000;

function initialPhase(iv: PublicInterview): Phase {
  if (iv.status === "done") return { name: "done" };
  if (iv.status === "failed") return { name: "failed" };
  if (iv.status === "scoring") return { name: "scoring" };
  return iv.mode === "text" ? { name: "text" } : { name: "voice-ready" };
}

/** Drafts and the question reached survive a refresh (best effort: storage can be off). */
function useStored<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = React.useState<T>(initial);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {}
  }, [key]);
  const set = React.useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {}
    },
    [key],
  );
  return [value, set];
}

function JobTitle({ iv }: { iv: PublicInterview }) {
  const title = [iv.jobTitle, iv.company].filter(Boolean).join(" · ") || "Practice interview";
  return <h1 className="text-h2 font-semibold tracking-tight text-ink">{title}</h1>;
}

/** Typed practice: one question on screen, the rest a step away. */
function TextPractice({ iv, onSubmitted }: { iv: PublicInterview; onSubmitted: (iv: PublicInterview | null, error?: string) => void }) {
  const [drafts, setDrafts] = useStored<string[]>(`hired:iv:${iv.id}:drafts`, iv.questions.map(() => ""));
  const [at, setAt] = useStored<number>(`hired:iv:${iv.id}:at`, 0);
  const [sending, setSending] = React.useState(false);
  const boxRef = React.useRef<HTMLTextAreaElement>(null);
  const total = iv.questions.length;
  const i = Math.min(Math.max(0, at), total - 1);
  const q = iv.questions[i];
  const value = drafts[i] ?? "";
  const answered = drafts.filter((d) => (d ?? "").trim().length >= INTERVIEW.minAnswerChars).length;
  const last = i === total - 1;

  React.useEffect(() => {
    boxRef.current?.focus({ preventScroll: true });
  }, [i]);

  const submit = async () => {
    setSending(true);
    const answers = drafts.map((text, index) => ({ index, text: (text ?? "").trim() })).filter((a) => a.text);
    onSubmitted(null); // straight to the scoring view: this takes a minute
    const r = await postJson(`/api/interview/${iv.id}/answers`, { answers }).catch(() => null);
    setSending(false);
    if (!r?.ok) return onSubmitted(null, typeof r?.json?.error === "string" ? r.json.error : "Couldn't score your answers. Try again.");
    try {
      localStorage.removeItem(`hired:iv:${iv.id}:drafts`);
      localStorage.removeItem(`hired:iv:${iv.id}:at`);
    } catch {}
    onSubmitted(r.json?.interview as PublicInterview);
  };

  return (
    <form
      className="flex flex-col gap-5 rounded-panel border border-hairline bg-surface p-5 md:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (last) void submit();
        else setAt(i + 1);
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="tabular text-body font-medium text-ink-2">
          {i + 1} of {total}
        </span>
        <Progress value={((i + 1) / total) * 100} label={`Question ${i + 1} of ${total}`} className="w-32" />
      </div>
      <label htmlFor="iv-answer" className="text-h3 font-semibold text-ink">
        {q.text}
      </label>
      <Textarea
        id="iv-answer"
        ref={boxRef}
        rows={8}
        value={value}
        maxLength={6000}
        onChange={(e) => {
          const next = [...drafts];
          next[i] = e.target.value;
          setDrafts(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder="Answer as you would out loud"
      />
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="lg" disabled={i === 0} onClick={() => setAt(i - 1)}>
          <ArrowLeft /> Back
        </Button>
        {last ? (
          <Tooltip content={answered === 0 ? "Answer at least one question." : "Skipped questions score 0."}>
            <span tabIndex={answered === 0 ? 0 : -1}>
              <Button type="submit" variant="primary" size="lg" loading={sending} disabled={answered === 0}>
                <Send /> Get feedback
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Button type="submit" variant={value.trim() ? "primary" : "secondary"} size="lg">
            {value.trim() ? "Next" : "Skip"} <ArrowRight />
          </Button>
        )}
      </div>
    </form>
  );
}

function ScoringView({ slow, onCheck }: { slow?: boolean; onCheck: () => void }) {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <span className="sr-only" role="status">
        Scoring your answers
      </span>
      <section className="flex flex-col items-center gap-5 rounded-panel border border-hairline bg-surface p-6 sm:flex-row sm:items-start md:p-8">
        <ScoringRing />
        <div className="flex w-full flex-1 flex-col gap-3 sm:pt-3">
          <p className="text-emph font-medium text-ink">{slow ? "Taking longer than usual" : "Scoring your answers"}</p>
          <Skeleton className="h-5 w-full max-w-md" />
          <Skeleton className="h-5 w-3/4 max-w-sm" />
          {slow && (
            <div>
              <Button variant="secondary" onClick={onCheck}>
                <RotateCw /> Check again
              </Button>
            </div>
          )}
        </div>
      </section>
      <div className="flex flex-col overflow-hidden rounded-panel border border-hairline bg-surface">
        {[0, 1, 2, 3, 4].map((k) => (
          <div key={k} className="flex items-center gap-3 border-b border-hairline px-5 py-4 last:border-b-0">
            <Skeleton className="h-5 w-6" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoringRing() {
  return (
    <div className="grid size-28 shrink-0 place-items-center rounded-full border-8 border-surface-2">
      <span className="size-3 animate-pulse rounded-full bg-accent" aria-hidden />
    </div>
  );
}

export function InterviewRoom({ initial, sdk = ELEVENLABS }: { initial: PublicInterview; sdk?: VoiceSdk }) {
  const [iv, setIv] = React.useState(initial);
  const [phase, setPhaseState] = React.useState<Phase>(() => initialPhase(initial));
  const phaseRef = React.useRef(phase);
  const setPhase = React.useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  // ── Voice ────────────────────────────────────────────────────────────────
  const [conn, setConn] = React.useState<Conn | null>(null);
  const [current, setCurrent] = useStored<number>(`hired:iv:${iv.id}:q`, -1);
  const currentRef = React.useRef(current);
  currentRef.current = current;
  const [caption, setCaption] = React.useState("");
  const [muted, setMuted] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const [connected, setConnected] = React.useState(false);
  const [left, setLeft] = React.useState<number | null>(null);
  const controlsRef = React.useRef<CallControls | null>(null);
  const deadline = React.useRef<number | null>(null);
  const reconnects = React.useRef(0);
  const nudged = React.useRef(false);
  const finishing = React.useRef(false);
  const endRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (phase.name !== "voice-ready") return;
    const s = readVoiceSupport();
    if (s !== "ok") setPhase({ name: "blocked", reason: s });
  }, [phase.name, setPhase]);

  const toScoring = React.useCallback(
    (next: PublicInterview | null) => {
      if (next) setIv(next);
      const status = next?.status ?? "scoring";
      setPhase(status === "done" ? { name: "done" } : status === "failed" ? { name: "failed" } : { name: "scoring" });
    },
    [setPhase],
  );

  const finish = React.useCallback(async () => {
    // Once, however many paths race here (End, timer, agent hang-up, hidden tab).
    if (finishing.current) return;
    finishing.current = true;
    setPhase({ name: "ending" });
    controlsRef.current?.end();
    controlsRef.current = null;
    setConn(null);
    setConnected(false);
    deadline.current = null;
    setLeft(null);
    const r = await postJson(`/api/interview/${iv.id}/finish`).catch(() => null);
    // A lost finish call loses nothing: the webhook and the cron score it.
    toScoring(r?.ok ? (r.json?.interview as PublicInterview) : null);
  }, [iv.id, setPhase, toScoring]);

  const token = React.useCallback(async () => {
    const r = await postJson(`/api/interview/${iv.id}/token`, { startAt: Math.max(0, currentRef.current) }).catch(() => null);
    if (!r?.ok) return { error: r?.status ?? 0, message: typeof r?.json?.error === "string" ? r.json.error : undefined };
    return r.json as { attempt: number; token: string; seconds: number; variables: Record<string, string> };
  }, [iv.id]);

  const start = async () => {
    const s = readVoiceSupport();
    if (s !== "ok") return setPhase({ name: "blocked", reason: s });
    setPhase({ name: "starting" });
    if (!(await askMic())) return setPhase({ name: "blocked", reason: "mic_denied" });
    const t = await token();
    if ("error" in t) {
      const reason = t.error === 410 ? "expired" : t.error === 503 ? "unavailable" : "error";
      return setPhase({ name: "blocked", reason, message: t.message });
    }
    finishing.current = false;
    reconnects.current = 0;
    nudged.current = false;
    deadline.current = Date.now() + t.seconds * 1000;
    setLeft(t.seconds);
    setConn({ attempt: t.attempt, token: t.token, variables: t.variables });
    setPhase({ name: "live" });
  };

  const reconnect = React.useCallback(async () => {
    setConnected(false);
    setConn(null);
    if (reconnects.current >= MAX_RECONNECTS) return void finish();
    reconnects.current += 1;
    setPhase({ name: "reconnecting" });
    await new Promise((res) => setTimeout(res, 800 * reconnects.current));
    if (phaseRef.current.name !== "reconnecting" || finishing.current) return;
    const t = await token();
    if ("error" in t) return void finish();
    deadline.current = Date.now() + t.seconds * 1000;
    setConn({ attempt: t.attempt, token: t.token, variables: t.variables });
    setPhase({ name: "live" });
  }, [finish, setPhase, token]);

  // The clock: warn the interviewer near the end, hang up at zero.
  React.useEffect(() => {
    if (phase.name !== "live") return;
    const t = setInterval(() => {
      if (!deadline.current) return;
      const s = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setLeft(s);
      if (s <= WRAP_UP_AT && !nudged.current) {
        nudged.current = true;
        controlsRef.current?.nudge("About 30 seconds left. Let the candidate finish, then close the interview warmly.");
      }
      if (s === 0) void finish();
    }, 250);
    return () => clearInterval(t);
  }, [phase.name, finish]);

  // A call left running in a hidden tab ends after a minute (and on page close).
  React.useEffect(() => {
    if (phase.name !== "live" && phase.name !== "reconnecting") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onVis = () => {
      if (document.visibilityState === "hidden") timer = setTimeout(() => void finish(), HIDDEN_END_MS);
      else if (timer) clearTimeout(timer);
    };
    const onHide = () => {
      fetch(`/api/interview/${iv.id}/finish`, { method: "POST", keepalive: true }).catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
    };
  }, [phase.name, finish, iv.id]);

  React.useEffect(() => {
    if (phase.name === "live") endRef.current?.focus({ preventScroll: true });
  }, [phase.name]);

  // Leaving the page inside the app mid-call (a header link, back): the
  // connection closes on unmount, so tell the server the call is over too.
  React.useEffect(
    () => () => {
      const p = phaseRef.current.name;
      if ((p === "live" || p === "reconnecting") && !finishing.current) {
        finishing.current = true;
        fetch(`/api/interview/${initial.id}/finish`, { method: "POST", keepalive: true }).catch(() => {});
      }
    },
    [initial.id],
  );

  const clientTools = React.useCallback(
    () => ({
      [BEGIN_QUESTION_TOOL]: (params: unknown) => {
        const n = Number((params as { number?: unknown } | null)?.number);
        if (Number.isInteger(n) && n >= 1 && n <= iv.questions.length) setCurrent(n - 1);
        return "ok";
      },
    }),
    [iv.questions.length, setCurrent],
  );

  const onConnected = React.useCallback(
    (conversationId: string) => {
      setConnected(true);
      // If this is lost, the webhook still finds the call by its session variables.
      postJson(`/api/interview/${iv.id}/connect`, { conversationId }).catch(() => {});
    },
    [iv.id],
  );

  const onLine = React.useCallback((kind: "user" | "agent", text: string) => {
    if (kind === "agent") setCaption(text);
  }, []);

  const onDropped = React.useCallback(
    (error: string | null) => {
      if (phaseRef.current.name !== "live" || finishing.current) return;
      // The interviewer closed the interview (or time ran out): that's the end.
      if (error === null || error === "agent") return void finish();
      void reconnect();
    },
    [finish, reconnect],
  );

  // ── Scoring: poll until the debrief is ready ─────────────────────────────
  const refresh = React.useCallback(async () => {
    const r = await fetch(`/api/interview/${iv.id}`, { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return;
    const j = (await r.json()) as { interview: PublicInterview };
    setIv(j.interview);
    if (j.interview.status === "done") setPhase({ name: "done" });
    else if (j.interview.status === "failed") setPhase({ name: "failed" });
  }, [iv.id, setPhase]);

  React.useEffect(() => {
    if (phase.name !== "scoring") return;
    const began = Date.now();
    const t = setInterval(() => {
      if (Date.now() - began > SLOW_AFTER_MS && !(phaseRef.current.name === "scoring" && phaseRef.current.slow)) setPhase({ name: "scoring", slow: true });
      void refresh();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [phase.name, refresh, setPhase]);

  // ── Render ───────────────────────────────────────────────────────────────
  // Same job, fresh questions.
  const againHref = `/interview/new?again=${iv.id}`;
  const back = (
    <Button asChild variant="ghost" size="sm" className="-ms-2 w-fit">
      <Link href="/interview">
        <ArrowLeft /> Interview
      </Link>
    </Button>
  );
  const shell = (body: React.ReactNode, wide = false) => (
    <div className={cn("mx-auto flex w-full flex-col gap-6 px-4 py-6 md:px-8 md:py-10", wide ? "max-w-3xl" : "max-w-2xl")}>
      <div className="flex flex-col gap-2">
        {back}
        <JobTitle iv={iv} />
      </div>
      {body}
    </div>
  );

  if (phase.name === "done" && iv.report) {
    return shell(
      <Debrief id={iv.id} resumeId={iv.resumeId} questions={iv.questions} answers={iv.answers} report={iv.report} appliedAdds={iv.appliedAdds} againHref={againHref} />,
      true,
    );
  }

  if (phase.name === "scoring" || (phase.name === "done" && !iv.report)) {
    return shell(<ScoringView slow={phase.name === "scoring" && phase.slow} onCheck={() => void refresh()} />, true);
  }

  if (phase.name === "failed") {
    const nothing = iv.error === "nothing answered" || iv.error === "never connected" || iv.error === "never started";
    return shell(
      <div className="rounded-panel border border-hairline bg-surface">
        <EmptyState
          icon={<MicOff />}
          title={nothing ? "Nothing to score" : "Couldn't score this one"}
          action={
            <div className="flex flex-col items-center gap-3">
              {iv.refunded && <Badge tone="neutral">Credit refunded</Badge>}
              <Button asChild variant="primary" size="lg">
                <Link href={againHref}>
                  <RotateCw /> Try again
                </Link>
              </Button>
            </div>
          }
        />
      </div>,
    );
  }

  if (phase.name === "text") {
    return shell(
      <TextPractice
        iv={iv}
        onSubmitted={(next, error) => {
          if (error) {
            toast.error(error);
            return setPhase({ name: "text" });
          }
          toScoring(next);
        }}
      />,
    );
  }

  if (phase.name === "blocked") {
    const view: Record<typeof phase.reason, { title: string; hint?: string; action: React.ReactNode }> = {
      mic_denied: {
        title: "Microphone blocked",
        hint: micHelp(),
        action: (
          <Button size="lg" variant="primary" onClick={() => setPhase({ name: "voice-ready" })}>
            <RotateCw /> Try again
          </Button>
        ),
      },
      unsupported: { title: "This browser can't use the mic", hint: "Try Chrome, Edge or Safari.", action: null },
      in_app: {
        title: "Open in Safari or Chrome",
        hint: "In-app browsers block the microphone.",
        action: (
          <Button variant="primary" size="lg" onClick={() => void navigator.clipboard?.writeText(window.location.href).then(() => toast("Link copied"))}>
            <Copy /> Copy link
          </Button>
        ),
      },
      unavailable: { title: phase.message ?? "Voice isn't available right now", action: null },
      expired: {
        title: phase.message ?? "This practice has ended",
        action: (
          <Button size="lg" variant="primary" onClick={() => void finish()}>
            Get feedback
          </Button>
        ),
      },
      error: {
        title: phase.message ?? "Couldn't start the call",
        action: (
          <Button size="lg" variant="primary" onClick={() => setPhase({ name: "voice-ready" })}>
            <RotateCw /> Try again
          </Button>
        ),
      },
    };
    const v = view[phase.reason];
    return shell(
      <div className="rounded-panel border border-hairline bg-surface">
        <EmptyState
          icon={<MicOff />}
          title={v.title}
          action={
            <div className="flex flex-col items-center gap-3">
              {v.hint && <p className="max-w-72 text-body text-ink-2">{v.hint}</p>}
              {v.action}
            </div>
          }
        />
      </div>,
    );
  }

  if (phase.name === "voice-ready" || phase.name === "starting") {
    const resuming = iv.status === "live";
    const minutes = Math.round(INTERVIEW.maxSeconds / 60);
    return shell(
      <div className="flex flex-col items-center gap-6 rounded-panel border border-hairline bg-surface px-6 py-12">
        <VoiceOrb
          state={phase.name === "starting" ? "connecting" : "idle"}
          label={phase.name === "starting" ? "Connecting" : resuming ? "Resume interview" : "Start interview"}
          onClick={phase.name === "starting" ? undefined : () => void start()}
          size={112}
        />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge tone="neutral">{iv.questions.length} questions</Badge>
          <Badge tone="neutral">Up to {minutes} min</Badge>
          <Tooltip content="An AI interviewer asks the questions and follows up. Audio isn't recorded.">
            <span tabIndex={0} aria-label="About the interviewer" className="grid size-11 place-items-center rounded-control text-ink-3 hover:text-ink">
              <Info className="size-4" />
            </span>
          </Tooltip>
        </div>
      </div>,
    );
  }

  // live | reconnecting | ending
  const q = current >= 0 ? iv.questions[current] : null;
  const orbState: VoiceState = !connected ? "connecting" : muted ? "muted" : speaking ? "speaking" : "listening";
  const low = left !== null && left <= 60;
  const status = phase.name === "reconnecting" ? "Reconnecting" : phase.name === "ending" ? "Ending" : null;
  const timeNotice = left === null ? "" : left <= 30 ? "30 seconds left" : left <= 60 ? "1 minute left" : "";
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-57px)] w-full max-w-2xl flex-col px-4 py-6 md:px-8 md:py-10">
      {conn && (
        <sdk.Provider key={conn.attempt}>
          <Connection
            sdk={sdk}
            conn={conn}
            clientTools={clientTools}
            muted={muted}
            controlsRef={controlsRef}
            onConnected={onConnected}
            onLine={onLine}
            onDropped={onDropped}
            onMode={setSpeaking}
          />
        </sdk.Provider>
      )}

      <div className="flex items-center justify-between gap-4">
        <span className="tabular text-body font-medium text-ink-2">{q ? `Question ${current + 1} of ${iv.questions.length}` : "Getting started"}</span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="relative grid size-2.5 place-items-center">
            {phase.name === "live" && <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger/50" />}
            <span className={cn("relative size-2.5 rounded-full", phase.name === "live" ? "bg-danger" : "bg-warn")} />
          </span>
          <span role="timer" className={cn("tabular text-emph font-medium", low ? "text-warn" : "text-ink")}>
            {left === null ? "–:––" : fmt(left)}
          </span>
        </span>
      </div>
      <span className="sr-only" role="status">
        {timeNotice}
      </span>

      <div className="mt-6 min-h-24">
        {q ? (
          <p key={current} className="text-h3 font-semibold text-ink animate-fade-in">
            {q.text}
          </p>
        ) : (
          <Skeleton className="h-7 w-2/3" />
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10">
        {phase.name === "live" ? (
          <LiveOrb state={orbState} controlsRef={controlsRef} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
        ) : (
          <VoiceOrb state="connecting" label={status ?? "Connecting"} size={88} />
        )}
        {/* Spoken aloud already: shown, not re-announced. */}
        <p className="line-clamp-3 min-h-18 max-w-md text-center text-body text-ink-2">{caption}</p>
      </div>

      <div className="sticky bottom-4 flex items-center justify-center gap-3">
        <IconButton size="lg" label={muted ? "Unmute" : "Mute"} active={muted} disabled={phase.name !== "live"} onClick={() => setMuted((m) => !m)}>
          {muted ? <MicOff /> : <Mic />}
        </IconButton>
        <Button ref={endRef} size="lg" variant="danger" loading={phase.name === "ending"} onClick={() => void finish()}>
          <PhoneOff /> End interview
        </Button>
      </div>
    </div>
  );
}

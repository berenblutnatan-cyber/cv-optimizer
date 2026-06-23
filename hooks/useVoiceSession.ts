"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseRealtimeToolCall } from "@/lib/voice/realtimeTools";

export type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "finalizing"
  | "error";

export type Turn = { role: "user" | "assistant"; text: string };
export type VoiceToolEvent = { id: string; label: string };

const MAX_SECONDS = 8 * 60; // 8 min hard cap to match server-side guarantee

type RealtimeEvent =
  | {
      type: "conversation.item.input_audio_transcription.completed";
      transcript: string;
      item_id?: string;
    }
  | {
      type: "response.audio_transcript.delta";
      delta: string;
      response_id?: string;
    }
  | {
      type: "response.audio_transcript.done";
      transcript: string;
      response_id?: string;
    }
  | { type: "response.created" }
  | { type: "response.done" }
  | { type: "input_audio_buffer.speech_started" }
  | { type: "input_audio_buffer.speech_stopped" }
  | { type: "error"; error: { message: string } }
  | { type: string; [k: string]: unknown };

export function useVoiceSession(opts?: {
  /** Called for each completed Realtime function call. Return a short label
   * for the UI feed (e.g. "Added PM at Acme"), or null to suppress it. */
  onToolCall?: (name: string, input: Record<string, unknown>) => string | null;
}) {
  const [state, setState] = useState<VoiceState>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [toolEvents, setToolEvents] = useState<VoiceToolEvent[]>([]);
  const [amplitude, setAmplitude] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const assistantBufRef = useRef<string>("");
  const onToolCallRef = useRef(opts?.onToolCall);
  onToolCallRef.current = opts?.onToolCall;
  // function_call_output items queued until response.done — sending them (or
  // response.create) while a response is still active is a protocol error.
  const pendingToolOutputsRef = useRef<string[]>([]);

  const tick = useCallback(() => {
    if (!startedAtRef.current) return;
    const e = Math.floor((Date.now() - startedAtRef.current) / 1000);
    setElapsed(e);
    if (e >= MAX_SECONDS) {
      // The orchestrator will call finalize via the consumer page;
      // we just stop the live stream here.
      stop();
    }
  }, []);

  useEffect(() => {
    if (state !== "idle" && state !== "error") {
      const id = window.setInterval(tick, 1000);
      return () => window.clearInterval(id);
    }
  }, [state, tick]);

  function attachAmplitude(stream: MediaStream) {
    try {
      const ctx =
        audioCtxRef.current ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        const avg = sum / buf.length / 255;
        setAmplitude(avg);
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (err) {
      console.warn("[useVoiceSession] amplitude tap failed:", err);
    }
  }

  function handleEvent(evt: RealtimeEvent) {
    // Live CV patching: the agent calls the same tools as the chat builder.
    const toolCall = parseRealtimeToolCall(
      evt as { type: string; item?: { type?: string; name?: string; call_id?: string; arguments?: string } }
    );
    if (toolCall) {
      const label = onToolCallRef.current?.(toolCall.name, toolCall.input) ?? null;
      if (label) {
        setToolEvents((list) => [
          ...list,
          { id: `${toolCall.callId}-${list.length}`, label },
        ]);
      }
      pendingToolOutputsRef.current.push(toolCall.callId);
      return;
    }

    if (evt.type === "conversation.item.input_audio_transcription.completed") {
      const text = String(evt.transcript ?? "").trim();
      if (text) setTurns((t) => [...t, { role: "user", text }]);
      return;
    }
    // Assistant transcript: GA renamed response.audio_transcript.* to
    // response.output_audio_transcript.* — accept both.
    if (
      evt.type === "response.audio_transcript.delta" ||
      evt.type === "response.output_audio_transcript.delta"
    ) {
      assistantBufRef.current += String((evt as { delta?: string }).delta ?? "");
      return;
    }
    if (
      evt.type === "response.audio_transcript.done" ||
      evt.type === "response.output_audio_transcript.done"
    ) {
      const text = (assistantBufRef.current || String((evt as { transcript?: string }).transcript ?? "")).trim();
      assistantBufRef.current = "";
      if (text) setTurns((t) => [...t, { role: "assistant", text }]);
      return;
    }
    if (evt.type === "input_audio_buffer.speech_started") {
      setState("listening");
      return;
    }
    if (evt.type === "response.created") {
      setState("thinking");
      return;
    }
    if (evt.type === "output_audio_buffer.started") {
      setState("speaking");
      return;
    }
    if (evt.type === "response.done") {
      // Acknowledge any function calls from this response, then ask the model
      // to continue speaking. Doing this mid-response is a protocol error.
      const pending = pendingToolOutputsRef.current;
      if (pending.length > 0 && dcRef.current?.readyState === "open") {
        for (const callId of pending) {
          dcRef.current.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: callId,
                output: "Applied. The user can see the change in their live CV preview.",
              },
            })
          );
        }
        pendingToolOutputsRef.current = [];
        dcRef.current.send(JSON.stringify({ type: "response.create" }));
        setState("thinking");
        return;
      }
      setState("listening");
      return;
    }
    if (evt.type === "error") {
      const err = (evt as { error?: { message?: string } }).error;
      setError(err?.message ?? "Voice error");
      setState("error");
    }
  }

  async function start() {
    setError(null);
    setState("connecting");
    setTurns([]);
    setToolEvents([]);
    pendingToolOutputsRef.current = [];
    setElapsed(0);
    startedAtRef.current = Date.now();

    let session: { client_secret: string | null; model: string };
    try {
      const res = await fetch("/api/voice/session", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Couldn't start voice session");
      }
      session = await res.json();
      if (!session.client_secret) throw new Error("Voice service didn't return a key");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start");
      setState("error");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access blocked. Allow the mic in your browser and try again.");
      setState("error");
      return;
    }
    localStreamRef.current = stream;
    attachAmplitude(stream);

    const pc = new RTCPeerConnection();
    pcRef.current = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // The assistant audio plays through the page's <audio> element. iOS Safari
    // needs autoPlay + playsInline + a user gesture to allow this — the start()
    // call always happens inside a click handler on the orb, so we're fine.
    pc.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(() => null);
      }
    };

    const dc = pc.createDataChannel("oai-events");
    dcRef.current = dc;
    dc.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as RealtimeEvent;
        handleEvent(data);
      } catch (e) {
        // Ignore malformed events.
      }
    };
    dc.onopen = () => setState("listening");

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // GA WebRTC handshake endpoint — the beta `/v1/realtime?model=` URL was
    // removed along with /v1/realtime/sessions.
    const sdpRes = await fetch(
      `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(session.model)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.client_secret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      }
    );
    if (!sdpRes.ok) {
      setError("Voice service refused the connection.");
      setState("error");
      return;
    }
    const answer: RTCSessionDescriptionInit = {
      type: "answer",
      sdp: await sdpRes.text(),
    };
    await pc.setRemoteDescription(answer);
  }

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => null);
      audioCtxRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (state !== "finalizing") setState("idle");
    startedAtRef.current = null;
  }

  function reset() {
    stop();
    setTurns([]);
    setToolEvents([]);
    pendingToolOutputsRef.current = [];
    setError(null);
    setElapsed(0);
    setState("idle");
  }

  function markFinalizing() {
    setState("finalizing");
  }

  useEffect(() => () => stop(), []);

  return {
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
  };
}

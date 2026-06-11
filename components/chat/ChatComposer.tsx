"use client";

import { useRef, useState } from "react";
import { ArrowUp, Loader2, Mic, MicOff, Paperclip } from "lucide-react";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";
import { track } from "@/lib/analytics";

const QUICK_CHIPS = [
  "Skip this question",
  "Tailor it to a job post",
  "Review my CV so far",
  "I'm done — wrap it up",
];

export function ChatComposer({
  onSend,
  onUpload,
  uploading,
  disabled,
}: {
  onSend: (text: string) => void;
  onUpload: (file: File) => void;
  uploading: boolean;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Dictation appends to whatever was typed before the mic was toggled on:
  // draft = base (pre-mic text) + accumulated finals + current interim.
  const baseRef = useRef("");
  const finalsRef = useRef("");

  const { supported, listening, error, toggle, stop } = useSpeechDictation({
    onTranscript: (finalText, interim) => {
      finalsRef.current += finalText;
      setDraft(`${baseRef.current}${finalsRef.current}${interim}`);
    },
  });

  function onMicClick() {
    if (!listening) {
      baseRef.current = draft ? `${draft.replace(/\s+$/, "")} ` : "";
      finalsRef.current = "";
    }
    track("chat_dictation_toggled", { on: !listening });
    toggle();
  }

  function send(text: string) {
    const clean = text.trim();
    if (!clean || disabled) return;
    if (listening) stop();
    setDraft("");
    onSend(clean);
    textareaRef.current?.focus();
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={disabled}
            onClick={() => send(chip)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/8 border border-glass-border text-xs text-white/75 hover:bg-white/15 hover:text-white transition-colors disabled:opacity-40"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2 rounded-2xl bg-white/10 border border-glass-border p-2 focus-within:border-white/30 transition-colors">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          aria-label="Upload your current CV (PDF)"
          title="Upload your current CV (PDF)"
          className="grid place-items-center h-10 w-10 rounded-xl bg-white/10 text-white/75 hover:bg-white/20 hover:text-white transition-colors disabled:opacity-40"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </button>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          rows={Math.min(5, Math.max(1, draft.split("\n").length))}
          placeholder={
            uploading
              ? "Reading your CV…"
              : listening
                ? "Listening — just talk…"
                : "Type your answer, or tap the mic and say it"
          }
          className="flex-1 resize-none bg-transparent text-white placeholder:text-white/45 text-[15px] leading-relaxed px-2 py-1.5 focus:outline-none"
        />
        {supported ? (
          <button
            type="button"
            onClick={onMicClick}
            aria-label={listening ? "Stop dictation" : "Dictate your answer"}
            aria-pressed={listening}
            className={`grid place-items-center h-10 w-10 rounded-xl transition-colors ${
              listening
                ? "bg-[#f5b8c8] text-[#1a1a1a] animate-pulse"
                : "bg-white/10 text-white/75 hover:bg-white/20 hover:text-white"
            }`}
          >
            {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => send(draft)}
          disabled={disabled || !draft.trim()}
          aria-label="Send"
          className="grid place-items-center h-10 w-10 rounded-xl bg-white text-[#1a1a1a] disabled:opacity-40 transition-opacity"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.2} />
        </button>
      </div>

      {error ? <div className="text-xs text-[#f5b8c8]">{error}</div> : null}
    </div>
  );
}

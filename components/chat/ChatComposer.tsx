"use client";

import { useRef, useState } from "react";
import { ArrowUp, Mic, MicOff } from "lucide-react";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";
import { track } from "@/lib/analytics";

const QUICK_CHIPS = ["Skip this question", "Review my CV so far", "I'm done — wrap it up"];

export function ChatComposer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
      <div className="flex flex-wrap gap-1.5">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={disabled}
            onClick={() => send(chip)}
            className="px-3 py-1.5 rounded-full bg-white/8 border border-glass-border text-xs text-white/75 hover:bg-white/15 hover:text-white transition-colors disabled:opacity-40"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2 rounded-2xl bg-white/10 border border-glass-border p-2 focus-within:border-white/30 transition-colors">
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
          placeholder={listening ? "Listening — just talk…" : "Type your answer, or tap the mic and say it"}
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

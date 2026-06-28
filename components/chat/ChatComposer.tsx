"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Mic, MicOff, Paperclip, Sparkles } from "lucide-react";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/LanguageProvider";

const DEFAULT_CHIPS = [
  "Skip this question",
  "Interview me — what's new?",
  "Tailor it to a job post",
  "Review my CV so far",
  "I'm done — wrap it up",
];

type Theme = "dark" | "light";

// Two skins: "dark" for the glass shells (builder / optimizer), "light" for the
// clean base44-style home chat. Logic (dictation, upload, auto-resize) is shared.
const SKIN: Record<
  Theme,
  {
    chip: string;
    box: string;
    iconBtn: string;
    textarea: string;
    micIdle: string;
    micOn: string;
    send: string;
    error: string;
  }
> = {
  dark: {
    chip: "bg-white/8 border-glass-border text-white/75 hover:bg-white/15 hover:text-white",
    box: "bg-white/10 border-glass-border focus-within:border-white/30",
    iconBtn: "bg-white/10 text-white/75 hover:bg-white/20 hover:text-white",
    textarea: "text-white placeholder:text-white/45",
    micIdle: "bg-white/10 text-white/75 hover:bg-white/20 hover:text-white",
    micOn: "bg-[#f5b8c8] text-[#1a1a1a] animate-pulse",
    send: "bg-white text-[#1a1a1a]",
    error: "text-[#f5b8c8]",
  },
  light: {
    chip: "bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 shadow-sm",
    box: "bg-white border-stone-300 focus-within:border-[#0A2647]/40 shadow-sm",
    iconBtn: "bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700",
    textarea: "text-[#1a1a1a] placeholder:text-stone-400",
    micIdle: "bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700",
    micOn: "bg-[#0A2647] text-white animate-pulse",
    send: "bg-[#0A2647] text-white hover:bg-[#0d3259]",
    error: "text-rose-600",
  },
};

export function ChatComposer({
  onSend,
  onUpload,
  uploading,
  disabled,
  prefill,
  prefillNonce = 0,
  chips = DEFAULT_CHIPS,
  placeholder,
  uploadingLabel,
  theme = "dark",
  minRows = 1,
  sendLabel,
}: {
  onSend: (text: string) => void;
  onUpload: (file: File) => void;
  uploading: boolean;
  disabled: boolean;
  /** When set, the send button shows this label (with a sparkle) instead of the
   * bare arrow — used for the single-shot "generate a full draft" entry. */
  sendLabel?: string;
  /** Text dropped into the textarea (focused, ready to edit) when
   * prefillNonce changes — used by the preview's quick-edit chips. */
  prefill?: string;
  prefillNonce?: number;
  /** Quick-reply chips above the composer. Pass [] to hide them. */
  chips?: string[];
  /** Override the idle textarea placeholder. */
  placeholder?: string;
  /** Override the "uploading" placeholder. */
  uploadingLabel?: string;
  /** "dark" (glass shells) or "light" (home chat). */
  theme?: Theme;
  /** Minimum textarea rows — bump to 2-3 for a roomier base44-style box. */
  minRows?: number;
}) {
  const { t } = useT();
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const skin = SKIN[theme];

  useEffect(() => {
    if (!prefillNonce || !prefill) return;
    setDraft(prefill);
    textareaRef.current?.focus();
  }, [prefill, prefillNonce]);
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
      {chips.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={disabled}
              onClick={() => send(chip)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-xs transition-colors disabled:opacity-40 ${skin.chip}`}
            >
              {t(chip)}
            </button>
          ))}
        </div>
      ) : null}

      <div className={`flex items-end gap-2 rounded-2xl border p-2 transition-colors ${skin.box}`}>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
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
          aria-label={t("Upload your current CV (PDF or Word)")}
          title={t("Upload your current CV (PDF or Word)")}
          className={`grid place-items-center h-10 w-10 rounded-xl transition-colors disabled:opacity-40 ${skin.iconBtn}`}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </button>
        <textarea
          ref={textareaRef}
          dir="auto"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          rows={Math.min(6, Math.max(minRows, draft.split("\n").length))}
          placeholder={
            uploading
              ? uploadingLabel ?? t("Reading your CV…")
              : listening
                ? t("Listening — just talk…")
                : placeholder ?? t("Type your answer, or tap the mic and say it")
          }
          className={`flex-1 resize-none bg-transparent text-[15px] leading-relaxed px-2 py-1.5 focus:outline-none ${skin.textarea}`}
        />
        {supported ? (
          <button
            type="button"
            onClick={onMicClick}
            aria-label={listening ? t("Stop dictation") : t("Dictate your answer")}
            aria-pressed={listening}
            className={`grid place-items-center h-10 w-10 rounded-xl transition-colors ${
              listening ? skin.micOn : skin.micIdle
            }`}
          >
            {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => send(draft)}
          disabled={disabled || !draft.trim()}
          aria-label={sendLabel ?? t("Send")}
          className={`inline-flex items-center justify-center gap-1.5 h-10 rounded-xl disabled:opacity-40 transition-colors ${
            sendLabel ? "px-4 w-auto" : "w-10"
          } ${skin.send}`}
        >
          {sendLabel ? (
            <>
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold whitespace-nowrap">{sendLabel}</span>
            </>
          ) : (
            <ArrowUp className="h-5 w-5" strokeWidth={2.2} />
          )}
        </button>
      </div>

      {error ? <div className={`text-xs ${skin.error}`}>{error}</div> : null}
    </div>
  );
}

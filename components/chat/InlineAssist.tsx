"use client";

// Inline ✨ AI assist for the Edit pane: a small trigger pill that generates a
// suggestion (free), shows it in an accept/discard card, and applies it via the
// gated useInlineAssist.apply(). Self-contained so InlineCvEditor just drops one
// <InlineAssist /> per field/section.

import { useState } from "react";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { useInlineAssist } from "@/hooks/useInlineAssist";
import { track } from "@/lib/analytics";
import { ASSIST_LABEL, type AssistAction, type AssistTarget, type AssistSuggestion } from "@/lib/assist/actions";
import { useT } from "@/lib/i18n/LanguageProvider";

export function InlineAssist({
  action,
  getTarget,
  label,
  className,
}: {
  action: AssistAction;
  /** Computed lazily so it reflects the latest field values at click time. */
  getTarget: () => AssistTarget;
  label?: string;
  className?: string;
}) {
  const { t } = useT();
  const { generate, apply } = useInlineAssist();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [suggestion, setSuggestion] = useState<AssistSuggestion | null>(null);

  async function onGenerate() {
    if (loading) return;
    setLoading(true);
    setSuggestion(null);
    const s = await generate(action, getTarget());
    setSuggestion(s);
    setLoading(false);
  }

  async function onAccept() {
    if (!suggestion || applying) return;
    setApplying(true);
    const ok = await apply(action, getTarget(), suggestion);
    setApplying(false);
    if (ok) setSuggestion(null);
  }

  function onDiscard() {
    track("inline_assist_discarded", { tool: action });
    setSuggestion(null);
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onGenerate}
        disabled={loading}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#B8860B]/10 border border-[#B8860B]/25 text-[11px] font-medium text-[#8a6608] hover:bg-[#B8860B]/20 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        {loading ? t("Thinking…") : label ?? t(ASSIST_LABEL[action])}
      </button>

      {suggestion ? (
        <div className="mt-2 rounded-xl border border-stone-200 bg-white p-3">
          {suggestion.text ? (
            <p className="text-[13px] text-[#1a1a1a] leading-relaxed whitespace-pre-wrap">{suggestion.text}</p>
          ) : null}
          {suggestion.items && suggestion.items.length > 0 ? (
            <ul className="space-y-1.5">
              {suggestion.items.map((it, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-[#1a1a1a] leading-relaxed">
                  <span className="text-[#B8860B]">•</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={onAccept}
              disabled={applying}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0A2647] text-white text-[12px] font-semibold hover:bg-[#0d3259] disabled:opacity-60 transition-colors"
            >
              {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              {applying ? t("Applying…") : t("Accept")}
            </button>
            <button
              type="button"
              onClick={onDiscard}
              disabled={applying}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] text-stone-500 hover:bg-stone-100 disabled:opacity-60 transition-colors"
            >
              <X className="h-3 w-3" /> {t("Discard")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

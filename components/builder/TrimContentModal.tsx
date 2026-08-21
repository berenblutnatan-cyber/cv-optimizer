"use client";

// User-confirmed content trims — shown when auto-fit is out of density
// (fitReport.atMinimum). One undo group per apply, so Cmd+Z reverts the
// whole trim.

import { useMemo, useState } from "react";
import { Scissors, X } from "lucide-react";
import { buildTrimSuggestions } from "@/lib/builder/fitSuggestions";
import { applyCvToolCall } from "@/lib/chat/cvTools";
import { useResumeStore } from "@/store/useResumeStore";
import { useT } from "@/lib/i18n/LanguageProvider";

export function TrimContentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const resumeData = useResumeStore((s) => s.resumeData);
  const suggestions = useMemo(() => buildTrimSuggestions(resumeData), [resumeData]);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  if (!open) return null;

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const apply = () => {
    const store = useResumeStore.getState();
    store.beginUndoGroup();
    try {
      let acc = store.resumeData;
      for (const s of suggestions) {
        if (checked.has(s.id)) acc = applyCvToolCall(acc, s.patch.name, s.patch.input);
      }
      store.setResumeData(acc);
    } finally {
      store.endUndoGroup();
    }
    setChecked(new Set());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-sm shadow-2xl border border-stone-200 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-navy">
            <Scissors className="w-4 h-4" /> {t("Trim to fit")}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close")}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-3 space-y-1">
          {suggestions.length === 0 ? (
            <p className="text-sm text-stone-500 px-2 py-4 text-center">
              {t("Nothing left to trim — switch to 2 pages instead.")}
            </p>
          ) : (
            suggestions.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-stone-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked.has(s.id)}
                  onChange={() => toggle(s.id)}
                  className="w-4 h-4 accent-brand-navy"
                />
                <span className="text-sm text-stone-700 flex-1 min-w-0">{s.label}</span>
                <span className="text-sm text-stone-400 tabular-nums flex-shrink-0">
                  −{s.estLinesSaved}
                </span>
              </label>
            ))
          )}
        </div>
        <div className="px-5 py-4 border-t border-stone-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 rounded-sm transition-colors"
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={checked.size === 0}
            className="px-4 py-2 rounded-sm bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy-hover disabled:opacity-50 transition-colors"
          >
            {t("Trim")}
          </button>
        </div>
      </div>
    </div>
  );
}

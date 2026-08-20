"use client";

// Generic form renderer driven by lib/toolkit/tools.ts field specs.
// The "cv" field type shows the builder CV as a chip with a paste fallback.

import { useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { ToolSpec } from "@/lib/toolkit/tools";

export function ToolForm({
  spec,
  builderCvText,
  prefill,
  busy,
  onGenerate,
}: {
  spec: ToolSpec;
  /** resumeToText of the builder store CV ("" when empty). */
  builderCvText: string;
  /** Values seeded by the caller (e.g. the Review Studio next-steps strip). */
  prefill?: Record<string, string>;
  busy: boolean;
  onGenerate: (inputs: Record<string, string>) => void;
}) {
  const { t } = useT();
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...prefill }));
  const [pasteCv, setPasteCv] = useState(false);

  const set = (name: string, value: string) => setValues((prev) => ({ ...prev, [name]: value }));

  const cvValue = (name: string) => values[name] ?? (pasteCv ? "" : builderCvText);

  const canSubmit = spec.fields.every((f) => {
    if (!f.required) return true;
    const v = f.type === "cv" ? cvValue(f.name) : (values[f.name] ?? "");
    return v.trim().length > 0;
  });

  const submit = () => {
    const inputs: Record<string, string> = {};
    for (const f of spec.fields) {
      const v = f.type === "cv" ? cvValue(f.name) : (values[f.name] ?? "");
      if (v.trim()) inputs[f.name] = v;
    }
    onGenerate(inputs);
  };

  return (
    <div className="space-y-3">
      {spec.fields.map((f) => {
        if (f.type === "cv") {
          const hasBuilderCv = builderCvText.trim().length >= 40;
          const usingBuilder = hasBuilderCv && !pasteCv && !(values[f.name] ?? "").trim();
          return (
            <div key={f.name}>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t(f.label)}</label>
              {usingBuilder ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 bg-stone-50">
                  <FileText className="w-4 h-4 text-brand-navy flex-shrink-0" />
                  <span className="text-sm text-stone-600 flex-1">{t("Using your builder CV")}</span>
                  <button
                    type="button"
                    onClick={() => setPasteCv(true)}
                    className="text-sm font-medium text-brand-navy hover:underline underline-offset-2"
                  >
                    {t("Change")}
                  </button>
                </div>
              ) : (
                <textarea
                  value={values[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  rows={5}
                  placeholder={t("Paste your CV text")}
                  className="w-full rounded-lg border border-stone-200 p-2.5 text-sm leading-relaxed focus:outline-none focus:border-brand-navy/40 resize-y"
                />
              )}
            </div>
          );
        }
        if (f.type === "textarea") {
          return (
            <div key={f.name}>
              <label className="block text-sm font-medium text-stone-600 mb-1">
                {t(f.label)}
                {f.required ? <span className="text-red-400"> *</span> : null}
              </label>
              <textarea
                value={values[f.name] ?? ""}
                onChange={(e) => set(f.name, e.target.value)}
                rows={f.rows ?? 4}
                placeholder={f.placeholder ? t(f.placeholder) : undefined}
                className="w-full rounded-lg border border-stone-200 p-2.5 text-sm leading-relaxed focus:outline-none focus:border-brand-navy/40 resize-y"
              />
            </div>
          );
        }
        if (f.type === "select") {
          return (
            <div key={f.name}>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t(f.label)}</label>
              <select
                value={values[f.name] ?? ""}
                onChange={(e) => set(f.name, e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-2.5 py-2 text-sm bg-white focus:outline-none focus:border-brand-navy/40"
              >
                <option value="">—</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {t(o)}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        return (
          <div key={f.name}>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              {t(f.label)}
              {f.required ? <span className="text-red-400"> *</span> : null}
            </label>
            <input
              type="text"
              value={values[f.name] ?? ""}
              onChange={(e) => set(f.name, e.target.value)}
              placeholder={f.placeholder ? t(f.placeholder) : undefined}
              className="w-full rounded-lg border border-stone-200 px-2.5 py-2 text-sm focus:outline-none focus:border-brand-navy/40"
            />
          </div>
        );
      })}

      <button
        type="button"
        onClick={submit}
        disabled={busy || !canSubmit}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy-hover disabled:opacity-50 transition-colors"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {busy ? t("Writing…") : t("Generate")}
      </button>
    </div>
  );
}

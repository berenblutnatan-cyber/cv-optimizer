"use client";

// Generic result renderer: copyable text blocks, lists, and the offer matrix.

import { useState } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { track } from "@/lib/analytics";
import type { ToolSpec } from "@/lib/toolkit/tools";
import { OfferMatrix, type MatrixRow } from "./OfferMatrix";

export function ToolResult({
  spec,
  result,
  onReset,
}: {
  spec: ToolSpec;
  result: Record<string, unknown>;
  onReset: () => void;
}) {
  const { t } = useT();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    track("toolkit_copy_clicked", { tool: spec.id, key });
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="space-y-4">
      {spec.output.map((field) => {
        const value = result[field.key];
        if (value == null) return null;

        if (field.kind === "matrix") {
          return (
            <div key={field.key}>
              <div className="text-sm font-semibold text-brand-navy mb-1.5">{t(field.label)}</div>
              <OfferMatrix rows={value as MatrixRow[]} />
            </div>
          );
        }

        if (field.kind === "list") {
          const items = (Array.isArray(value) ? value : []).map(String);
          if (items.length === 0) return null;
          return (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-brand-navy">{t(field.label)}</span>
                <CopyButton copied={copiedKey === field.key} onClick={() => copy(field.key, items.join("\n"))} />
              </div>
              <ul className="rounded-lg border border-stone-200 px-3.5 py-2.5 space-y-1">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-navy/40 flex-shrink-0" />
                    <span className="text-sm text-stone-700 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        const text = String(value);
        return (
          <div key={field.key}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-brand-navy">{t(field.label)}</span>
              <CopyButton copied={copiedKey === field.key} onClick={() => copy(field.key, text)} />
            </div>
            <div className="rounded-lg border border-stone-200 px-3.5 py-2.5">
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{text}</p>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" /> {t("Start over")}
      </button>
    </div>
  );
}

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-sm font-medium text-brand-navy hover:underline underline-offset-2"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      {t("Copy")}
    </button>
  );
}

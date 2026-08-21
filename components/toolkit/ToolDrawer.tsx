"use client";

// Right-sheet drawer hosting one toolkit tool (form → result). Reused by the
// /toolkit hub and the Review Studio next-steps strip. Plain conditional
// render + CSS — no AnimatePresence.

import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { track } from "@/lib/analytics";
import { TOOLS, type ToolId } from "@/lib/toolkit/tools";
import { ToolForm } from "./ToolForm";
import { ToolResult } from "./ToolResult";

export function ToolDrawer({
  toolId,
  builderCvText,
  prefill,
  onClose,
}: {
  toolId: ToolId | null;
  builderCvText: string;
  prefill?: Record<string, string>;
  onClose: () => void;
}) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  if (!toolId) return null;
  const spec = TOOLS[toolId];

  const generate = async (inputs: Record<string, string>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/toolkit/${toolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        track("toolkit_generation_failed", { tool: toolId, reason: res.status === 429 ? "rate_limit" : "error" });
        toast.error(data?.error || t("Couldn't generate — try again."));
        return;
      }
      setResult(data.result as Record<string, unknown>);
      track("toolkit_generated", { tool: toolId });
    } catch {
      track("toolkit_generation_failed", { tool: toolId, reason: "network" });
      toast.error(t("Network error — try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-lg h-full bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 flex-shrink-0">
          <div>
            <div className="text-sm font-semibold text-brand-navy">{t(spec.title)}</div>
            <div className="text-sm text-stone-400">{t(spec.tagline)}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close")}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {result ? (
            <ToolResult spec={spec} result={result} onReset={() => setResult(null)} />
          ) : (
            <ToolForm
              spec={spec}
              builderCvText={builderCvText}
              prefill={prefill}
              busy={busy}
              onGenerate={generate}
            />
          )}
        </div>
      </div>
    </div>
  );
}

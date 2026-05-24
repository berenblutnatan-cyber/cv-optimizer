"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/shell/GlassCard";
import { BlurredLock } from "@/components/shell/BlurredLock";

export type ImprovementItem = {
  id: string;
  text: string;
  scoreImpact: number;
  category: "ats" | "impact" | "clarity";
  unlocked: boolean;
};

const CATEGORY_LABEL: Record<ImprovementItem["category"], string> = {
  ats: "ATS",
  impact: "Impact",
  clarity: "Clarity",
};

export function ImprovementsList({
  analysisId,
  items,
  onPaywall,
}: {
  analysisId: string | null;
  items: ImprovementItem[];
  // Called when the user wants to unlock but lacks credits. The parent should
  // open the existing OutOfCreditsModal with trigger="improvement".
  onPaywall: () => void;
}) {
  const [rows, setRows] = useState(items);
  const [busy, startTransition] = useTransition();

  const lockedCount = rows.filter((r) => !r.unlocked).length;
  const totalLockedImpact = rows
    .filter((r) => !r.unlocked)
    .reduce((sum, r) => sum + r.scoreImpact, 0);

  function unlockAll() {
    if (!analysisId) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/analyze/${analysisId}/unlock`, { method: "POST" });
        if (res.status === 402) {
          onPaywall();
          return;
        }
        if (!res.ok) throw new Error("Unlock failed");
        setRows((prev) => prev.map((r) => ({ ...r, unlocked: true })));
        toast.success(`+${totalLockedImpact} pts unlocked`);
      } catch (e) {
        toast.error("Couldn't unlock — try again");
      }
    });
  }

  if (rows.length === 0) return null;

  return (
    <GlassCard padding="lg" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
            Top improvements
          </div>
          <h3 className="mt-1 font-serif italic text-2xl text-white">
            What's holding you back
          </h3>
        </div>
        {lockedCount > 0 ? (
          <button
            type="button"
            onClick={unlockAll}
            disabled={busy || !analysisId}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#1a1a1a] text-sm font-medium shadow-glow disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Unlock all (+{totalLockedImpact} pts)
            <span className="ml-1 text-xs text-[#1a1a1a]/55">1 credit</span>
          </button>
        ) : null}
      </div>

      <ul className="space-y-2.5">
        {rows.map((imp) => (
          <motion.li
            key={imp.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/8 border border-glass-border">
              <span
                className={[
                  "shrink-0 mt-0.5 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold tabular-nums",
                  imp.scoreImpact >= 8
                    ? "bg-[#f5b8c8] text-[#1a1a1a]"
                    : imp.scoreImpact >= 4
                      ? "bg-[#c9b8ff] text-[#1a1a1a]"
                      : "bg-white/15 text-white/90",
                ].join(" ")}
              >
                <TrendingUp className="h-3 w-3" />
                +{imp.scoreImpact}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/45 mb-1">
                  {CATEGORY_LABEL[imp.category]}
                </div>
                <BlurredLock
                  locked={!imp.unlocked}
                  scoreImpact={imp.scoreImpact}
                  label="Unlock"
                  onUnlock={unlockAll}
                >
                  <p className="text-sm leading-relaxed text-white/90">{imp.text}</p>
                </BlurredLock>
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
    </GlassCard>
  );
}

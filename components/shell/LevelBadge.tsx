"use client";

import { Sparkles } from "lucide-react";

export type Level = "Junior" | "Mid" | "Senior" | "Principal" | "Director";

export const LEVEL_THRESHOLDS: Array<{ level: Level; min: number }> = [
  { level: "Junior", min: 0 },
  { level: "Mid", min: 500 },
  { level: "Senior", min: 1500 },
  { level: "Principal", min: 3500 },
  { level: "Director", min: 7000 },
];

export function levelForXp(xp: number): { level: Level; nextXp: number; baseXp: number } {
  let current = LEVEL_THRESHOLDS[0];
  let next = LEVEL_THRESHOLDS[1];
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i].min) {
      current = LEVEL_THRESHOLDS[i];
      next = LEVEL_THRESHOLDS[i + 1] ?? LEVEL_THRESHOLDS[i];
    }
  }
  return { level: current.level, nextXp: next.min, baseXp: current.min };
}

export function LevelBadge({ xp }: { xp: number }) {
  const { level, nextXp, baseXp } = levelForXp(xp);
  const range = Math.max(1, nextXp - baseXp);
  const progress = Math.min(1, (xp - baseXp) / range);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-glass-border backdrop-blur-glass">
      <Sparkles className="h-3.5 w-3.5 text-[#f5b8c8]" />
      <span className="text-xs font-medium text-white/90">{level}</span>
      <div className="h-1.5 w-16 rounded-full bg-white/15 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#f5b8c8] to-[#8fb3ff]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span className="text-[10px] text-white/55 tabular-nums">{xp} XP</span>
    </div>
  );
}

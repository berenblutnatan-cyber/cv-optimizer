"use client";

// Device-local free-allowance counter for inline AI assist. Mirrors the
// flash-sale store's approach (persisted, client-side) — generation is always
// free; the first few APPLIES are free (the hook), then sign-up / credits kick
// in (the paywall). Low-stakes + already rate-limited server-side, so a
// localStorage counter is the right weight here.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const FREE_INLINE_ASSISTS = 2;

interface AssistStore {
  freeAssistsUsed: number;
  recordFreeAssist: () => void;
}

export const useAssistStore = create<AssistStore>()(
  persist(
    (set) => ({
      freeAssistsUsed: 0,
      recordFreeAssist: () => set((s) => ({ freeAssistsUsed: s.freeAssistsUsed + 1 })),
    }),
    { name: "inline-assist" }
  )
);

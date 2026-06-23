"use client";

// Engagement-triggered flash sale. After the user takes a few real actions in
// the builder (recordAction), we ARM a one-time, 5-minute, 80%-off-Pro offer.
// The countdown is anchored to `armedAt` and persisted, so a refresh keeps the
// SAME five minutes ticking — and once it expires (or is claimed/dismissed) it
// moves to a terminal status and never shows again. One shot per device.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { track } from "@/lib/analytics";

/** Real builder interactions before the sale arms — "a little bit, a few clicks". */
export const ENGAGEMENT_THRESHOLD = 4;
/** How long the flash stays live once armed. */
export const FLASH_WINDOW_MS = 5 * 60 * 1000;

type FlashStatus = "idle" | "armed" | "claimed" | "dismissed" | "expired";

interface FlashSaleStore {
  /** Count of meaningful interactions while still idle. */
  actions: number;
  /** Epoch ms when the flash armed (countdown anchor); null until armed. */
  armedAt: number | null;
  status: FlashStatus;
  /** Count one interaction; arms the flash when it crosses the threshold. */
  recordAction: () => void;
  /** The 5-minute window elapsed — terminal, never shows again. */
  expire: () => void;
  /** User closed the banner — terminal. */
  dismiss: () => void;
  /** User clicked through to checkout — terminal. */
  markClaimed: () => void;
}

export const useFlashSaleStore = create<FlashSaleStore>()(
  persist(
    (set, get) => ({
      actions: 0,
      armedAt: null,
      status: "idle",
      recordAction: () => {
        // Only the idle phase counts. Once armed or finished it's a no-op, so
        // the offer can never re-arm or reset — one shot per device.
        if (get().status !== "idle") return;
        const next = get().actions + 1;
        if (next >= ENGAGEMENT_THRESHOLD) {
          set({ actions: next, status: "armed", armedAt: Date.now() });
          track("flash_sale_armed", { plan: "pro_flash" });
        } else {
          set({ actions: next });
        }
      },
      expire: () => {
        if (get().status === "armed") set({ status: "expired" });
      },
      dismiss: () => set({ status: "dismissed" }),
      markClaimed: () => set({ status: "claimed" }),
    }),
    { name: "hired-flash-sale" }
  )
);

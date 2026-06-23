"use client";

// Client hook powering the inline ✨ assist buttons in the Edit pane.
//  - generate(): always free (server rate-limited). Returns a suggestion.
//  - apply():    free for the first FREE_INLINE_ASSISTS, then sign-up (anon) or
//                1 credit (signed-in; subscribers bypass server-side). The
//                "free hook, paywall the payoff" gate. Applies via the same
//                deterministic applyCvToolCall reducer the chat builder uses.

import { useCallback } from "react";
import { toast } from "sonner";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useResumeStore } from "@/store/useResumeStore";
import { useFlashSaleStore } from "@/stores/flashSaleStore";
import { useAssistStore, FREE_INLINE_ASSISTS } from "@/stores/assistStore";
import { applyCvToolCall, snapshotForPrompt } from "@/lib/chat/cvTools";
import { track } from "@/lib/analytics";
import {
  buildAssistInput,
  type AssistAction,
  type AssistTarget,
  type AssistSuggestion,
} from "@/lib/assist/actions";

export function useInlineAssist() {
  const { isSignedIn } = useUser();
  const { openSignUp } = useClerk();
  const router = useRouter();

  const generate = useCallback(
    async (action: AssistAction, target: AssistTarget): Promise<AssistSuggestion | null> => {
      const cv = useResumeStore.getState().resumeData;
      try {
        const res = await fetch("/api/assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, cvContext: snapshotForPrompt(cv), target }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.message(data?.error ?? "Couldn't generate — try again.");
          return null;
        }
        track("inline_assist_generated", { tool: action });
        return (data.suggestion ?? null) as AssistSuggestion | null;
      } catch {
        toast.error("Network error.");
        return null;
      }
    },
    []
  );

  const apply = useCallback(
    async (action: AssistAction, target: AssistTarget, suggestion: AssistSuggestion): Promise<boolean> => {
      const cv = useResumeStore.getState().resumeData;
      const built = buildAssistInput(action, suggestion, target, cv);
      if (!built) {
        toast.message("Nothing to apply.");
        return false;
      }

      const { freeAssistsUsed, recordFreeAssist } = useAssistStore.getState();
      const withinFree = freeAssistsUsed < FREE_INLINE_ASSISTS;

      if (!withinFree) {
        if (!isSignedIn) {
          track("inline_assist_blocked", { reason: "signup" });
          useFlashSaleStore.getState().recordAction();
          toast.message("Create a free account to keep improving.", { description: "Your first ones are on us." });
          openSignUp?.();
          return false;
        }
        // Beyond the free allowance: spend a credit (subscribers bypass on the server).
        const credit = await fetch("/api/use-credit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const result = await credit.json().catch(() => ({ success: false }));
        if (!result?.success) {
          track("inline_assist_blocked", { reason: "out_of_credits" });
          useFlashSaleStore.getState().recordAction();
          toast.message("You're out of credits", { description: "Top up or grab the Pro offer to keep applying." });
          router.push("/pricing");
          return false;
        }
      }

      useResumeStore.getState().setResumeData(applyCvToolCall(cv, built.tool, built.input));
      if (withinFree) recordFreeAssist();
      useFlashSaleStore.getState().recordAction();
      track("inline_assist_applied", { tool: action });
      return true;
    },
    [isSignedIn, openSignUp, router]
  );

  return { generate, apply };
}

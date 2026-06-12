"use client";

// Cloud sync for the CV draft. Until now the resume lived ONLY in
// localStorage — clear the browser or switch devices and it's gone. This
// component (mounted once in the root layout) makes the server a mirror:
//
//   on sign-in:  server copy fills an empty local draft
//                (a non-empty local draft always wins — it's what the user
//                 is actively editing on THIS device)
//   afterwards:  every local change autosaves, debounced
//
// Conflict policy is deliberately last-write-wins per device; the product
// has a single draft per user, not a document store.

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useResumeStore } from "@/store/useResumeStore";
import { isPlaceholderSummary } from "@/lib/chat/prompts";
import type { ResumeData } from "@/types/resume";

const SAVE_DEBOUNCE_MS = 2_500;

function isEmptyDraft(cv: ResumeData): boolean {
  return (
    !cv.personalInfo.name.trim() &&
    cv.experience.length === 0 &&
    cv.education.length === 0 &&
    cv.skills.length === 0 &&
    isPlaceholderSummary(cv.summary)
  );
}

export function ResumeSync() {
  const { isSignedIn } = useUser();
  const lastSyncedRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const loadedRef = useRef(false);

  // Initial pull on sign-in.
  useEffect(() => {
    if (!isSignedIn || loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      try {
        const res = await fetch("/api/resume");
        if (!res.ok) return;
        const data = await res.json();
        const local = useResumeStore.getState().resumeData;
        if (data?.resumeData && isEmptyDraft(local)) {
          useResumeStore.getState().setResumeData(data.resumeData);
          lastSyncedRef.current = JSON.stringify(data.resumeData);
        } else if (!isEmptyDraft(local)) {
          // Local wins; push it up if it differs from the server copy.
          const localJson = JSON.stringify(local);
          if (localJson !== JSON.stringify(data?.resumeData ?? null)) {
            void save(local);
          } else {
            lastSyncedRef.current = localJson;
          }
        }
      } catch {
        // Offline / server hiccup — localStorage still has the draft.
      }
    })();
  }, [isSignedIn]);

  async function save(cv: ResumeData) {
    const json = JSON.stringify(cv);
    if (json === lastSyncedRef.current) return;
    try {
      const res = await fetch("/api/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData: cv }),
      });
      if (res.ok) lastSyncedRef.current = json;
    } catch {
      // Next change retries; the draft is never blocked on the network.
    }
  }

  // Debounced autosave on every store change.
  useEffect(() => {
    if (!isSignedIn) return;
    const unsubscribe = useResumeStore.subscribe((state, prev) => {
      if (state.resumeData === prev.resumeData) return;
      if (isEmptyDraft(state.resumeData)) return; // don't persist a reset
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void save(useResumeStore.getState().resumeData);
      }, SAVE_DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [isSignedIn]);

  return null;
}

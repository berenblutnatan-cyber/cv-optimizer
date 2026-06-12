"use client";

// Transcript state for the chat-first CV builder. Persisted to localStorage
// so a refresh mid-interview keeps the conversation; the CV itself lives in
// useResumeStore (also persisted) and stays the single source of truth.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ChatToolEvent = {
  id: string;
  label: string;
  /** True while the tool call's args are still streaming — renders as a
   * shimmer chip ("Writing your summary…") until the final label replaces it. */
  pending?: boolean;
};

export type BuilderChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Compact text shown in the bubble instead of `content` (e.g. "📎 my-cv.pdf"
   * for an upload turn whose real content is the full extracted CV text). */
  display?: string;
  /** CV patches the agent applied during this turn — rendered as chips. */
  tools?: ChatToolEvent[];
};

interface ChatBuilderStore {
  messages: BuilderChatMessage[];
  addMessage: (msg: BuilderChatMessage) => void;
  updateMessage: (id: string, patch: Partial<BuilderChatMessage>) => void;
  appendToMessage: (id: string, text: string) => void;
  addToolToMessage: (id: string, tool: ChatToolEvent) => void;
  /** Replace the oldest pending tool chip with its final label (or drop it). */
  resolvePendingTool: (id: string, label: string | null) => void;
  clear: () => void;
}

export const useChatBuilderStore = create<ChatBuilderStore>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      updateMessage: (id, patch) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      appendToMessage: (id, text) =>
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === id ? { ...m, content: m.content + text } : m
          ),
        })),
      addToolToMessage: (id, tool) =>
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === id ? { ...m, tools: [...(m.tools ?? []), tool] } : m
          ),
        })),
      resolvePendingTool: (id, label) =>
        set((s) => ({
          messages: s.messages.map((m) => {
            if (m.id !== id || !m.tools?.some((t) => t.pending)) return m;
            const idx = m.tools.findIndex((t) => t.pending);
            const tools =
              label === null
                ? m.tools.filter((_, i) => i !== idx)
                : m.tools.map((t, i) => (i === idx ? { ...t, label, pending: false } : t));
            return { ...m, tools };
          }),
        })),
      clear: () => set({ messages: [] }),
    }),
    { name: "chat-builder-transcript" }
  )
);

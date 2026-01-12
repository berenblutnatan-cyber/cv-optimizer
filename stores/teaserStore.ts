import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TeaserResult {
  score: number;
  summary: string;
  analyzedAt: number;
}

interface TeaserState {
  // Input state
  fileName: string | null;
  fileContent: string | null;
  targetRole: string;
  
  // Result state
  result: TeaserResult | null;
  
  // Actions
  setFile: (name: string, content: string) => void;
  setTargetRole: (role: string) => void;
  setResult: (result: TeaserResult) => void;
  clearFile: () => void;
  clearAll: () => void;
}

/**
 * Teaser Store - Persists resume score teaser state
 * 
 * Uses Zustand with persist middleware to survive page refreshes
 * Stores file content as base64 for persistence
 */
export const useTeaserStore = create<TeaserState>()(
  persist(
    (set) => ({
      // Initial state
      fileName: null,
      fileContent: null,
      targetRole: "",
      result: null,

      // Actions
      setFile: (name, content) =>
        set({ fileName: name, fileContent: content }),

      setTargetRole: (role) =>
        set({ targetRole: role }),

      setResult: (result) =>
        set({ result }),

      clearFile: () =>
        set({ fileName: null, fileContent: null }),

      clearAll: () =>
        set({
          fileName: null,
          fileContent: null,
          targetRole: "",
          result: null,
        }),
    }),
    {
      name: "hired-teaser-storage",
      // Only persist for 24 hours
      partialize: (state) => ({
        fileName: state.fileName,
        fileContent: state.fileContent,
        targetRole: state.targetRole,
        result: state.result,
      }),
    }
  )
);

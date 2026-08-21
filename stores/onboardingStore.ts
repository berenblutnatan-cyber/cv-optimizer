import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OnboardingState {
  roles: string[];
  /** Funnel experience bucket ("student" | "1-3" | "3-5" | "5-10" | "10+").
   * Feeds seniority-calibrated coaching (lib/knowledge). */
  experience: string | null;
  cvFileName: string | null;
  cvText: string | null;
  setRoles: (roles: string[]) => void;
  setExperience: (experience: string | null) => void;
  setCv: (fileName: string, text: string) => void;
  clear: () => void;
}

// Carries the marketing-funnel choices across the Clerk auth modal so that
// after sign-up we can sync `User.targetRoles` and drop the uploaded CV
// straight into the optimizer without making the user re-do anything.
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      roles: [],
      experience: null,
      cvFileName: null,
      cvText: null,
      setRoles: (roles) => set({ roles: roles.slice(0, 5) }),
      setExperience: (experience) => set({ experience }),
      setCv: (cvFileName, cvText) => set({ cvFileName, cvText }),
      clear: () => set({ roles: [], experience: null, cvFileName: null, cvText: null }),
    }),
    { name: "hired-onboarding" }
  )
);

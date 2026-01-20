export const ANALYSIS_SESSION_KEY = "cv_optimizer_analysis_v1";

export type AnalysisMode = "title_only" | "specific_role";

export type AnalysisSessionPayload = {
  analysis: unknown;
  meta: {
    mode: AnalysisMode;
    jobTitle: string;
    jobUrl?: string;
    companyName?: string;
    cvTextUsed?: string;
    jobDescriptionUsed?: string;
  };
  coverLetter?: string;
  // For re-optimization with additional skills
  originalInputs?: {
    cvFile: string | null;
    cvText: string;
    jobTitle: string;
    jobDescription: string;
    jobUrl: string;
    summary?: string;
  };
};

export function saveAnalysisToSession(payload: AnalysisSessionPayload) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ANALYSIS_SESSION_KEY, JSON.stringify(payload));
}

export function loadAnalysisFromSession<T = unknown>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(ANALYSIS_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearAnalysisSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ANALYSIS_SESSION_KEY);
}



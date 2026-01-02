export const ANALYSIS_SESSION_KEY = "cv_optimizer_analysis_v1";

export function saveAnalysisToSession(analysis: unknown) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ANALYSIS_SESSION_KEY, JSON.stringify(analysis));
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



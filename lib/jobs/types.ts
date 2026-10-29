// The jobs tracker: shapes shared by server and browser. Client-safe.
// Statuses are the legacy tracker's values (same table), shown with v2 labels.

export const JOB_STAGES = ["BOOKMARKED", "APPLIED", "INTERVIEWING", "OFFER", "REJECTED"] as const;
export type JobStage = (typeof JOB_STAGES)[number];

export const STAGE_LABEL: Record<JobStage, string> = {
  BOOKMARKED: "Saved",
  APPLIED: "Applied",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  REJECTED: "Closed",
};

export function isStage(v: unknown): v is JobStage {
  return typeof v === "string" && (JOB_STAGES as readonly string[]).includes(v);
}

/** One row of the tracker (table and board). */
export type JobSummary = {
  id: string;
  company: string;
  title: string;
  stage: JobStage;
  url: string | null;
  location: string | null;
  resumeId: string | null;
  resumeTitle: string | null;
  /** Fit score at the latest tailoring check for this job. */
  score: number | null;
  nextStep: string | null;
  nextStepAt: string | null;
  updatedAt: string;
};

export type JobDetail = JobSummary & {
  jdText: string | null;
  salary: string | null;
  notes: string | null;
  appliedAt: string | null;
  tailorings: { id: string; resumeId: string; scoreOriginal: number; scoreOptimized: number; createdAt: string }[];
  interviews: { id: string; status: string; mode: string; overall: number | null; createdAt: string }[];
  letter: { id: string; body: string; flags: string[]; updatedAt: string } | null;
};

/** Fields the browser may change. Everything else is derived on the server. */
export type JobPatch = Partial<{
  company: string;
  title: string;
  stage: JobStage;
  url: string | null;
  location: string | null;
  salary: string | null;
  notes: string | null;
  jdText: string | null;
  resumeId: string | null;
  nextStep: string | null;
  nextStepAt: string | null;
}>;

/** A next step that is due today or overdue. */
export function isDue(nextStepAt: string | null, now = new Date()): boolean {
  if (!nextStepAt) return false;
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return new Date(nextStepAt).getTime() <= end.getTime();
}

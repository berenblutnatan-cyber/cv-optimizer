// Job application tracker — shared types. `status` is a String in Postgres
// (no Prisma enums anywhere in this schema); this union is the source of truth
// for valid values + display order.

export const APPLICATION_STATUSES = ["BOOKMARKED", "APPLIED", "INTERVIEWING", "OFFER", "REJECTED"] as const;
export type JobApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABEL: Record<JobApplicationStatus, string> = {
  BOOKMARKED: "Bookmarked",
  APPLIED: "Applied",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

export function isStatus(v: unknown): v is JobApplicationStatus {
  return typeof v === "string" && (APPLICATION_STATUSES as readonly string[]).includes(v);
}

export type ApplicationDTO = {
  id: string;
  company: string;
  title: string;
  url: string | null;
  jdText: string | null;
  location: string | null;
  salary: string | null;
  status: JobApplicationStatus;
  notes: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

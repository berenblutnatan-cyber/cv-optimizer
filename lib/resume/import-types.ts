import type { ResumeData } from "@/types/resume";

// Shared by the import route and the Start screen (client-safe: no server imports).

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const IMPORT_ACCEPT = ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

export type ImportEvent =
  | { type: "partial"; content: ResumeData }
  | { type: "done"; id: string }
  | { type: "error"; error: string; code: string };

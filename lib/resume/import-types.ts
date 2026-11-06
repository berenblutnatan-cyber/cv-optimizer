import type { ResumeData } from "@/types/resume";
import type { DesignState } from "./document";

// Shared by the import route and the Start screen (client-safe: no server imports).

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const IMPORT_ACCEPT = ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

/** The file's own design, matched to a Hired one (lib/import/mapDesign). Sent as soon as it's read. */
export type ImportedLook = { design: Pick<DesignState, "template" | "accentColor">; photo: string | null; layout: string };

export type ImportEvent =
  | { type: "partial"; content: ResumeData }
  | { type: "design"; look: ImportedLook }
  | { type: "done"; id: string }
  | { type: "error"; error: string; code: string };

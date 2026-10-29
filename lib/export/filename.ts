// One rule for every export's file name (PDF title, DOCX, TXT), client and server.

/** "Dana Levi CV" — the person's name with filesystem-hostile characters removed. */
export function cvFileBase(name: string | undefined | null): string {
  const clean = (name || "").replace(/[^\p{L}\p{N} ._-]+/gu, "").replace(/\s+/g, " ").trim().slice(0, 80);
  return `${clean || "My"} CV`;
}

/** A Content-Disposition header that survives non-ASCII names (RFC 6266 / 5987). */
export function attachmentHeader(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

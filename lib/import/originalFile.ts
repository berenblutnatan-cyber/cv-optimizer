"use client";

// The PDF someone just uploaded, kept in memory for this visit so the review
// can show "Your original" beside the Hired version. Never uploaded or stored:
// a reload forgets it, and the review then shows the Hired version alone.

let held: { cvId: string | null; url: string } | null = null;

export function holdOriginal(file: File): void {
  releaseOriginal();
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) held = { cvId: null, url: URL.createObjectURL(file) };
}

/** The upload became this CV. */
export function bindOriginal(cvId: string): void {
  if (held && !held.cvId) held.cvId = cvId;
}

export function originalUrl(cvId: string): string | null {
  return held?.cvId === cvId ? held.url : null;
}

export function releaseOriginal(): void {
  if (held) URL.revokeObjectURL(held.url);
  held = null;
}

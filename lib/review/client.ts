"use client";

import { readSse } from "@/lib/http/readSse";
import type { CvTarget } from "@/lib/resume/document";
import type { CvReadout, ReviewEvent } from "./view";

/** Aim the CV at a job (or clear it), through the same op log as every edit. */
export async function saveTarget(cvId: string, target: CvTarget | undefined): Promise<void> {
  const res = await fetch(`/api/cv/${cvId}/ops`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ops: [{ clientOpId: `target:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`, name: "set_target", input: target ?? {} }] }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Couldn't save the job.");
}

export async function fetchReview(cvId: string): Promise<{ readout: CvReadout | null; current: boolean }> {
  const res = await fetch(`/api/cv/${cvId}/review`, { cache: "no-store" });
  if (!res.ok) throw new Error("Couldn't load the review.");
  return res.json();
}

/** Run the read; resolves with the readout or throws with a message to show. */
export async function runReview(cvId: string, signal?: AbortSignal): Promise<CvReadout> {
  const res = await fetch(`/api/cv/${cvId}/review`, { method: "POST", signal });
  if (!res.ok || !res.body) throw new Error((await res.json().catch(() => null))?.error ?? "The review didn't finish. Try again.");
  let out: CvReadout | null = null;
  let failure = "";
  await readSse<ReviewEvent>(res.body, (e) => {
    if (e.type === "done") out = e.readout;
    else if (e.type === "error") failure = e.error;
  });
  if (out) return out;
  throw new Error(failure || "The connection dropped. Try again.");
}

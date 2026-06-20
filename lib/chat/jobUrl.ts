// Client helpers for the "paste a job link, I'll read it" flow.
// The chat clients detect a URL in the user's message, fetch the posting via
// /api/fetch-job, and fold the extracted text into the message they send the
// agent (so it tailors against the real posting). On any failure they fall back
// to sending the raw message — the agent then asks for a pasted description.

export type JobFetchResult = { ok: boolean; text?: string; title?: string; error?: string };

/** First http(s) URL in a message, with trailing punctuation trimmed. */
export function firstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"')\]]+/i);
  if (!m) return null;
  return m[0].replace(/[.,;:!?)]+$/, "");
}

export async function fetchJobPosting(url: string): Promise<JobFetchResult> {
  try {
    const res = await fetch("/api/fetch-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !data?.text) {
      return { ok: false, error: data?.error ?? "Couldn't read that link." };
    }
    return { ok: true, text: data.text, title: data.title };
  } catch {
    return { ok: false, error: "Network error reading that link." };
  }
}

/** Wrap a user message with fetched job text the agent can tailor against. */
export function withJobPosting(userText: string, url: string, job: JobFetchResult): string {
  const titlePart = job.title ? ` — "${job.title}"` : "";
  return `${userText}\n\n(Job posting I fetched from ${url}${titlePart}):\n"""\n${job.text}\n"""`;
}

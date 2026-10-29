// Interview practice: shapes shared by server, browser and the voice agent.
// Pure and client-safe (no imports: the browser bundle stays small).

export type InterviewQuestion = {
  /** What the interviewer asks, word for word. */
  text: string;
  /** Behavioral (STAR) or about the role's requirements. */
  kind: "behavioral" | "role" | "opener";
  /** The CV gap or job requirement it probes, in a few words (shown in the debrief). */
  focus: string;
};

export type InterviewAnswer = { index: number; text: string };

export type AnswerFeedback = {
  index: number;
  /** 0-10. */
  score: number;
  worked: string[];
  missing: string[];
  /** The same answer, stronger, using only what they said and what's on the CV. */
  stronger: string;
  /** A fact they said aloud that belongs on the CV, with the words that prove it. */
  addToCv: { experienceIndex: number; company: string; role: string; bullet: string; quote: string } | null;
};

export type InterviewReport = {
  /** 0-100. */
  overall: number;
  summary: string;
  answers: AnswerFeedback[];
};

export type InterviewMode = "voice" | "text";
export type InterviewStatus = "ready" | "live" | "scoring" | "done" | "failed";

export const INTERVIEW = {
  credits: 1,
  questions: 5,
  /** Voice: the whole call, all reconnects included. */
  maxSeconds: 15 * 60,
  maxAttempts: 4,
  minAnswerChars: 15,
} as const;

/** The agent marks each question with this client tool; the transcript is split on it. */
export const BEGIN_QUESTION_TOOL = "begin_question";

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/**
 * Split an ElevenLabs interview transcript into answers: every user turn after
 * the agent calls begin_question(n) belongs to question n (follow-up replies
 * included), until the next question. Turns before the first question are
 * small talk and dropped.
 */
export function answersFromTranscript(rawTranscript: unknown, questionCount: number): InterviewAnswer[] {
  const byIndex = new Map<number, string[]>();
  let current: number | null = null;
  for (const t of Array.isArray(rawTranscript) ? rawTranscript : []) {
    const turn = obj(t);
    if (!turn) continue;
    for (const tc of Array.isArray(turn.tool_calls) ? turn.tool_calls : []) {
      const call = obj(tc);
      if (call?.tool_name !== BEGIN_QUESTION_TOOL) continue;
      let params: Record<string, unknown> | null = null;
      try {
        params = obj(typeof call.params_as_json === "string" ? JSON.parse(call.params_as_json) : call.params_as_json);
      } catch {
        params = null;
      }
      const n = Number(params?.number);
      if (Number.isInteger(n) && n >= 1 && n <= questionCount) current = n - 1;
    }
    const text = typeof turn.message === "string" ? turn.message.trim() : "";
    if (turn.role === "user" && text && current !== null) {
      byIndex.set(current, [...(byIndex.get(current) ?? []), text]);
    }
  }
  return [...byIndex.entries()].sort((a, b) => a[0] - b[0]).map(([index, parts]) => ({ index, text: parts.join(" ").slice(0, 6000) }));
}

/** Typed answers from the browser: one per question index, trimmed, bounded. */
export function cleanTypedAnswers(raw: unknown, questionCount: number): InterviewAnswer[] {
  const seen = new Set<number>();
  const out: InterviewAnswer[] = [];
  for (const a of Array.isArray(raw) ? raw : []) {
    const o = obj(a);
    const index = Number(o?.index);
    const text = typeof o?.text === "string" ? o.text.trim().slice(0, 6000) : "";
    if (!Number.isInteger(index) || index < 0 || index >= questionCount || seen.has(index) || !text) continue;
    seen.add(index);
    out.push({ index, text });
  }
  return out.sort((a, b) => a.index - b.index);
}

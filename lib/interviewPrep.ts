// Interview Prep — shared types + prompt builders for /api/interview-prep.
// Free tier returns 3 plain questions (no STAR/pitch in the payload — gated
// server-side, not blurred). The paid unlock returns full STAR answers + a pitch.

export type InterviewQuestion = { question: string; starAnswer?: string };

export type InterviewPrepResult = {
  questions: InterviewQuestion[];
  pitch?: string;
  locked: boolean;
};

export const INTERVIEW_SYSTEM_PROMPT =
  "You are an expert interview coach. Ground every question and answer in the candidate's REAL experience from their CV — never invent employers, projects, metrics, or skills they didn't list. Respond with valid JSON only.";

export function buildInterviewPrompt(opts: {
  cvText: string;
  role: string;
  jobText?: string;
  full: boolean;
}): string {
  const { cvText, role, jobText, full } = opts;
  const jobBlock = jobText ? `\n\nTARGET JOB POSTING:\n"""\n${jobText.slice(0, 6000)}\n"""` : "";
  const cvBlock = `CANDIDATE CV:\n"""\n${cvText.slice(0, 8000)}\n"""`;

  if (!full) {
    return `${cvBlock}${jobBlock}

TARGET ROLE: ${role || "their target role"}

Generate exactly 3 likely interview questions this candidate should prepare for, specific to their background and the target role. Do NOT include answers.

Return ONLY this JSON:
{ "questions": [ { "question": "..." }, { "question": "..." }, { "question": "..." } ] }`;
  }

  return `${cvBlock}${jobBlock}

TARGET ROLE: ${role || "their target role"}

Generate a full interview-prep pack for this candidate:
1. 8 likely interview questions (mix of behavioral and role-specific).
2. For EACH question, a model answer in STAR format (Situation, Task, Action, Result) drawn ONLY from the candidate's real CV — if their CV lacks a relevant example, write the answer scaffold and note what they should fill in, but never fabricate facts or numbers.
3. A 30-second personal pitch ("tell me about yourself") tailored to the target role.

Return ONLY this JSON:
{
  "questions": [ { "question": "...", "starAnswer": "Situation: ... Task: ... Action: ... Result: ..." } ],
  "pitch": "..."
}`;
}

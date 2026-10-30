import { containsNormalized } from "@/lib/optimizer/ground";
import type { AnswerFeedback, InterviewAnswer } from "./types";

/**
 * Keep an "add to CV" only when it is real: the quote is in that answer (the
 * user said it), and it targets an existing role. Anything else is dropped.
 */
export function groundAddToCv(
  feedback: AnswerFeedback,
  answers: InterviewAnswer[],
  experience: { company: string; role: string }[],
): AnswerFeedback {
  const add = feedback.addToCv;
  if (!add) return feedback;
  const answer = answers.find((a) => a.index === feedback.index)?.text ?? "";
  const entry = experience[add.experienceIndex];
  const ok = !!entry && add.bullet.trim().length > 10 && add.quote.trim().length >= 8 && containsNormalized(answer, add.quote);
  return ok ? { ...feedback, addToCv: { ...add, company: entry.company, role: entry.role, bullet: add.bullet.trim() } } : { ...feedback, addToCv: null };
}

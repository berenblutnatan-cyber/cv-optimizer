import { describe, expect, it } from "vitest";
import { groundAddToCv } from "./ground";
import { answersFromTranscript, cleanTypedAnswers, type AnswerFeedback } from "./types";

const mark = (n: unknown) => ({ type: "client", tool_name: "begin_question", params_as_json: JSON.stringify({ number: n }) });

describe("answersFromTranscript", () => {
  it("drops small talk, groups follow-up replies under their question, ignores bad marks", () => {
    const t = [
      { role: "agent", message: "Ready?" },
      { role: "user", message: "Yes, ready." },
      { role: "agent", message: "Walk me through it.", tool_calls: [mark(1)] },
      { role: "user", message: "I'm a PM at Acme." },
      { role: "agent", message: "One concrete result?" },
      { role: "user", message: "Activation went from 31 to 46 percent." },
      { role: "agent", message: "Next.", tool_calls: [mark(2)] },
      { role: "user", message: "  " },
      { role: "agent", message: "Bogus.", tool_calls: [mark(9), mark("x"), { tool_name: "end_call", params_as_json: "{}" }] },
      { role: "user", message: "We disagreed with sales." },
      { role: "agent", message: "Broken.", tool_calls: [{ tool_name: "begin_question", params_as_json: "{not json" }] },
      { role: "user", message: "I pulled cohort data." },
    ];
    expect(answersFromTranscript(t, 5)).toEqual([
      { index: 0, text: "I'm a PM at Acme. Activation went from 31 to 46 percent." },
      { index: 1, text: "We disagreed with sales. I pulled cohort data." },
    ]);
  });

  it("accepts parsed params and survives junk input", () => {
    expect(answersFromTranscript([{ role: "agent", tool_calls: [{ tool_name: "begin_question", params_as_json: { number: 3 } }] }, { role: "user", message: "Answer" }], 3)).toEqual([{ index: 2, text: "Answer" }]);
    expect(answersFromTranscript(null, 5)).toEqual([]);
    expect(answersFromTranscript([1, "x", null], 5)).toEqual([]);
  });
});

describe("cleanTypedAnswers", () => {
  it("keeps one trimmed answer per valid index, sorted", () => {
    expect(
      cleanTypedAnswers(
        [
          { index: 2, text: "  third  " },
          { index: 0, text: "first" },
          { index: 0, text: "dup" },
          { index: 7, text: "out of range" },
          { index: 1, text: "   " },
          { index: "1", text: "string index" },
          null,
        ],
        3,
      ),
    ).toEqual([
      { index: 0, text: "first" },
      { index: 1, text: "string index" },
      { index: 2, text: "third" },
    ]);
    expect(cleanTypedAnswers("nope", 3)).toEqual([]);
  });
});

describe("groundAddToCv", () => {
  const exp = [{ company: "Acme", role: "Senior PM" }];
  const answers = [{ index: 0, text: "I saved the company a vendor contract worth 80 thousand dollars by moving us in-house." }];
  const fb = (add: AnswerFeedback["addToCv"]): AnswerFeedback => ({ index: 0, score: 6, worked: [], missing: [], stronger: "", addToCv: add });

  it("keeps a fact the candidate said, filled with the real role", () => {
    const out = groundAddToCv(fb({ experienceIndex: 0, company: "", role: "", bullet: " Saved $80K by moving a vendor tool in-house ", quote: "a vendor contract worth 80 thousand dollars" }), answers, exp);
    expect(out.addToCv).toEqual({ experienceIndex: 0, company: "Acme", role: "Senior PM", bullet: "Saved $80K by moving a vendor tool in-house", quote: "a vendor contract worth 80 thousand dollars" });
  });

  it("drops an invented quote, an unknown role, or an empty bullet", () => {
    expect(groundAddToCv(fb({ experienceIndex: 0, company: "", role: "", bullet: "Saved $200K on vendors", quote: "saved two hundred thousand" }), answers, exp).addToCv).toBeNull();
    expect(groundAddToCv(fb({ experienceIndex: 3, company: "", role: "", bullet: "Saved $80K on vendors", quote: "vendor contract worth 80" }), answers, exp).addToCv).toBeNull();
    expect(groundAddToCv(fb({ experienceIndex: 0, company: "", role: "", bullet: "short", quote: "vendor contract worth 80" }), answers, exp).addToCv).toBeNull();
    expect(groundAddToCv(fb(null), answers, exp).addToCv).toBeNull();
  });
});

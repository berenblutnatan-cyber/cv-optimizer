import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { generateQuestions, scoreInterview } from "./ai";
import { fullCv } from "@/test/fixtures/fullCv";

const reply = (body: { stop_reason?: string; text?: string }) => ({
  stop_reason: body.stop_reason ?? "end_turn",
  content: [{ type: "thinking", thinking: "" }, { type: "text", text: body.text ?? "" }],
});
const client = (create: (p: Record<string, unknown>) => unknown) => ({ beta: { messages: { create: vi.fn(async (p: Record<string, unknown>) => create(p)) } } }) as unknown as Anthropic & { beta: { messages: { create: ReturnType<typeof vi.fn> } } };
const content = fullCv().content;
const JD = "Senior PM, payments. ".repeat(10);

describe("interview model calls", () => {
  it("asks for schema-constrained JSON, never a forced tool (5.5 models reject it)", async () => {
    const c = client(() => reply({ text: JSON.stringify({ questions: [1, 2, 3, 4, 5].map((n) => ({ text: `Question number ${n} about checkout?`, kind: n === 1 ? "opener" : "weird", focus: "payments" })) }) }));
    const qs = await generateQuestions(c, { content, jd: JD, jobTitle: "PM", company: "Globex", analysis: null });
    const params = c.beta.messages.create.mock.calls[0][0];
    expect(params.tool_choice).toBeUndefined();
    expect(params.tools).toBeUndefined();
    expect(params.output_config).toMatchObject({ format: { type: "json_schema" } });
    expect(qs).toHaveLength(5);
    expect(qs[0].kind).toBe("opener");
    expect(qs[1].kind).toBe("behavioral"); // unknown kinds fall back
  });

  it("every object in both schemas forbids extra properties (structured outputs requires it)", async () => {
    const schemas: unknown[] = [];
    const c = client((p) => {
      schemas.push((p.output_config as { format: { schema: unknown } }).format.schema);
      return reply({ text: JSON.stringify({ questions: [], overall: 0, summary: "", answers: [] }) });
    });
    await generateQuestions(c, { content, jd: JD, jobTitle: "", company: "", analysis: null }).catch(() => {});
    await scoreInterview(c, { content, jd: JD, jobTitle: "", questions: [{ text: "Q?", kind: "opener", focus: "" }], answers: [] });
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== "object") return;
      const o = node as Record<string, unknown>;
      if (o.type === "object") expect(o.additionalProperties).toBe(false);
      Object.values(o).forEach(walk);
    };
    expect(schemas).toHaveLength(2);
    schemas.forEach(walk);
  });

  it("fails loudly on a cut-off, a refusal, or non-JSON instead of guessing", async () => {
    for (const r of [{ stop_reason: "max_tokens", text: '{"questions":[' }, { stop_reason: "refusal", text: "" }, { text: "Sure! Here are some questions" }]) {
      await expect(generateQuestions(client(() => reply(r)), { content, jd: JD, jobTitle: "", company: "", analysis: null })).rejects.toThrow();
    }
  });

  it("clamps scores, zeroes unanswered questions, grounds additions", async () => {
    const questions = [0, 1, 2].map((i) => ({ text: `Q${i}?`, kind: "behavioral" as const, focus: "x" }));
    const answers = [{ index: 0, text: "I cut churn by 12 percent by rebuilding the cancellation flow at Acme." }];
    const c = client(() =>
      reply({
        text: JSON.stringify({
          overall: 140,
          summary: "Good.",
          answers: [
            { index: 0, score: 14, worked: ["a"], missing: [], stronger: "s", addToCv: { experienceIndex: 0, bullet: "Cut churn 12% by rebuilding cancellation", quote: "cut churn by 12 percent" } },
            { index: 1, score: 8, worked: ["made up"], missing: [], stronger: "", addToCv: { experienceIndex: 0, bullet: "Grew revenue 3x overnight", quote: "grew revenue" } },
          ],
        }),
      }),
    );
    const r = await scoreInterview(c, { content, jd: JD, jobTitle: "PM", questions, answers });
    expect(r.overall).toBe(100);
    expect(r.answers.map((a) => a.score)).toEqual([10, 0, 0]);
    expect(r.answers[0].addToCv).toMatchObject({ company: content.experience[0].company, bullet: "Cut churn 12% by rebuilding cancellation" });
    expect(r.answers[1].addToCv).toBeNull();
    expect(r.answers[1].worked).toEqual([]);
  });
});

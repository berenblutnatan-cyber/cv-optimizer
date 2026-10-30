import { describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { parseCvTextStreaming, toResumeData } from "./parseCv";

const FINAL = {
  personalInfo: { name: "Dana Levi", email: "dana@example.com", title: "PM" },
  summary: "Ships onboarding that converts.",
  experience: [{ company: "Acme", role: "PM", startDate: "2021", endDate: "Present", description: ["Lifted activation 31% to 46%"] }],
  education: [{ institution: "TAU", degree: "B.Sc." }],
  skills: ["SQL", "Figma"],
};

/** A stand-in for client.messages.stream(): emits inputJson snapshots, then the final message. */
function fakeClient(snapshots: unknown[], final: { input: unknown; stop_reason?: string }) {
  let request: unknown;
  const client = {
    messages: {
      stream(req: unknown) {
        request = req;
        const handlers: ((d: string, s: unknown) => void)[] = [];
        return {
          on(event: string, fn: (d: string, s: unknown) => void) {
            if (event === "inputJson") handlers.push(fn);
            return this;
          },
          async finalMessage() {
            for (const s of snapshots) {
              handlers.forEach((h) => h("", s));
              await new Promise((r) => setTimeout(r, 2));
            }
            return { content: [{ type: "tool_use", id: "t1", name: "emit_resume", input: final.input }], stop_reason: final.stop_reason ?? "tool_use" };
          },
        };
      },
    },
  };
  return { client: client as unknown as Anthropic, request: () => request as Record<string, unknown> };
}

describe("toResumeData", () => {
  it("is safe on a partial snapshot (missing arrays, half-written entries)", () => {
    const r = toResumeData({ personalInfo: { name: "Da" }, experience: [{ company: "Acme" }, {}], skills: "not-an-array" } as Record<string, unknown>);
    expect(r.personalInfo.name).toBe("Da");
    expect(r.experience).toHaveLength(1);
    expect(r.education).toEqual([]);
    expect(r.skills).toEqual([]);
  });
});

describe("parseCvTextStreaming", () => {
  it("reports the CV as it is parsed, then returns the full verbatim result", async () => {
    const { client, request } = fakeClient(
      [{ personalInfo: { name: "Dana" } }, { personalInfo: { name: "Dana Levi" }, experience: [{ company: "Acme", role: "PM" }] }],
      { input: FINAL },
    );
    const partials: string[] = [];
    const out = await parseCvTextStreaming(client, "CV TEXT", (p) => partials.push(p.personalInfo.name), { intervalMs: 0 });
    expect(partials).toEqual(["Dana", "Dana Levi"]);
    expect(out.degraded).toBe(false);
    expect(out.resumeData.experience[0].description).toEqual(["Lifted activation 31% to 46%"]);
    expect(out.resumeData.experience[0].current).toBe(true);
    expect(out.resumeData.education[0].degree).toBe("B.Sc.");
    expect((request().tool_choice as { name: string }).name).toBe("emit_resume");
  });

  it("is degraded when the model ran out of tokens or found nothing", async () => {
    const cut = fakeClient([], { input: FINAL, stop_reason: "max_tokens" });
    expect((await parseCvTextStreaming(cut.client, "x", () => {})).degraded).toBe(true);
    const empty = fakeClient([], { input: { personalInfo: {}, summary: "", experience: [], education: [], skills: [] } });
    expect((await parseCvTextStreaming(empty.client, "x", () => {})).degraded).toBe(true);
  });
});

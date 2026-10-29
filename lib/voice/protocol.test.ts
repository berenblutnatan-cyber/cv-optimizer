import { describe, expect, it } from "vitest";
import { applyDocumentOp, emptyDocument } from "@/lib/resume/document";
import { intakeConversation } from "@/test/fixtures/voiceConversation";
import { isVoiceOpFor, opsFromConversation, parseConversation, parseVoiceOpId, toolResultText, voiceOpId } from "./protocol";

const SID = "cmsession0000000000000001";

describe("voice protocol", () => {
  it("reads the parts of an ElevenLabs conversation the server needs", () => {
    const rec = parseConversation(intakeConversation({ conversationId: "conv_abc123", sessionId: SID, attempt: 1, durationSec: 65 }))!;
    expect(rec).toMatchObject({ conversationId: "conv_abc123", status: "done", durationSec: 65, sessionId: SID, attempt: 1 });
    expect(rec.lines[0]).toEqual({ role: "agent", text: "Hi, I'm Hired. What's your name, and what do you do right now?", atSec: 0 });
    expect(rec.lines.some((l) => l.role === "user" && l.text.includes("Dana Levi"))).toBe(true);
  });

  it("numbers only CV client tool calls, counting a malformed one, skipping system tools", () => {
    const rec = parseConversation(intakeConversation({ conversationId: "conv_1", sessionId: SID }))!;
    expect(rec.toolCalls.map((t) => t.name)).toEqual([
      "update_personal_info",
      "add_experience",
      "update_experience",
      "set_skills", // malformed JSON: no input, but it keeps its number
      "add_education",
      "set_skills",
      "update_summary",
    ]);
    expect(rec.toolCalls[3].input).toBeNull();
    const ops = opsFromConversation(rec, SID, 2);
    // Six ops (the malformed one is dropped) under the browser's numbering.
    expect(ops.map((o) => o.clientOpId)).toEqual([0, 1, 2, 4, 5, 6].map((n) => voiceOpId(SID, 2, n)));
  });

  it("replaying the transcript through the reducer builds the CV the user described", () => {
    const rec = parseConversation(intakeConversation({ conversationId: "conv_2", sessionId: SID }))!;
    const doc = opsFromConversation(rec, SID, 0).reduce((d, op) => applyDocumentOp(d, op.name, op.input), emptyDocument());
    const c = doc.content;
    expect(c.personalInfo).toMatchObject({ name: "Dana Levi", title: "Product Manager", location: "Tel Aviv, Israel" });
    expect(c.experience).toHaveLength(1);
    expect(c.experience[0]).toMatchObject({ company: "Acme", role: "Product Manager" });
    expect(c.experience[0].description).toEqual(["Led the checkout redesign, lifting conversion 18%"]);
    expect(c.education[0]).toMatchObject({ institution: "Technion", degree: "BSc" });
    expect(c.skills).toEqual(["SQL", "Figma", "A/B testing"]);
    expect(c.summary).toContain("18%");
  });

  it("rejects payloads that aren't conversations", () => {
    expect(parseConversation(null)).toBeNull();
    expect(parseConversation({ transcript: [] })).toBeNull();
    expect(parseConversation({ conversation_id: "c", transcript: "nope" })).toMatchObject({ lines: [], toolCalls: [], sessionId: null, attempt: null });
  });

  it("op ids round-trip and are scoped to their session", () => {
    const id = voiceOpId(SID, 3, 41);
    expect(parseVoiceOpId(id)).toEqual({ sessionId: SID, attempt: 3, n: 41 });
    expect(isVoiceOpFor(id, SID)).toBe(true);
    expect(isVoiceOpFor(id, "cmsession0000000000000002")).toBe(false);
    expect(parseVoiceOpId("ed:1234-5678")).toBeNull();
    expect(parseVoiceOpId(`vc:${SID}:x:1`)).toBeNull();
  });

  it("tells the agent what changed and gives it fresh indices", () => {
    const doc = applyDocumentOp(emptyDocument(), "add_experience", { company: "Acme", role: "PM" });
    const ok = toolResultText("add_experience", { company: "Acme", role: "PM" }, doc.content, true);
    expect(ok).toMatch(/^Done: Added PM at Acme\./);
    expect(ok).toContain("Acme");
    expect(toolResultText("add_experience", {}, doc.content, false)).toMatch(/^No change/);
  });
});

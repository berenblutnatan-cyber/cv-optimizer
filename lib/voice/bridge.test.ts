import { describe, expect, it } from "vitest";
import { applyDocumentOp, emptyDocument, type ResumeDocument } from "@/lib/resume/document";
import { VoiceToolBridge } from "./bridge";
import { voiceOpId } from "./protocol";

const SID = "cmsession0000000000000009";

function harness() {
  let doc: ResumeDocument = emptyDocument();
  const saved: { id: string; name: string; sid: string }[] = [];
  const edits: string[] = [];
  const bridge = new VoiceToolBridge(SID, 1, {
    applyVoice: (name, input, clientOpId, sid) => {
      const next = applyDocumentOp(doc, name, input);
      if (next === doc) return false;
      doc = next;
      saved.push({ id: clientOpId, name, sid });
      return true;
    },
    getDoc: () => doc,
    onEdit: (l) => edits.push(l),
  });
  return { bridge, saved, edits, doc: () => doc };
}

describe("voice tool bridge", () => {
  it("applies each call under the agent's numbering and answers with the new CV", () => {
    const h = harness();
    const tools = h.bridge.clientTools();
    const r = tools.add_experience({ company: "Acme", role: "PM" });
    expect(r).toMatch(/^Done: Added PM at Acme/);
    tools.update_personal_info({ name: "Dana" });
    expect(h.saved).toEqual([
      { id: voiceOpId(SID, 1, 0), name: "add_experience", sid: SID },
      { id: voiceOpId(SID, 1, 1), name: "update_personal_info", sid: SID },
    ]);
    expect(h.edits).toEqual(["Added PM at Acme", "Updated your details"]);
    expect(h.doc().content.personalInfo.name).toBe("Dana");
  });

  it("a no-op or garbage call still uses its number, so the server's replay lines up", () => {
    const h = harness();
    const tools = h.bridge.clientTools();
    expect(tools.remove_experience({ index: 5 })).toMatch(/^No change/);
    expect(tools.set_skills("not an object")).toMatch(/^No change/);
    tools.set_skills({ skills: ["SQL"] });
    expect(h.saved.map((s) => s.id)).toEqual([voiceOpId(SID, 1, 2)]);
    expect(h.bridge.count).toBe(3);
  });

  it("exposes exactly the CV tools", () => {
    const names = Object.keys(harness().bridge.clientTools());
    expect(names).toContain("add_experience");
    expect(names).toContain("set_design");
    expect(names).not.toContain("end_call");
  });
});

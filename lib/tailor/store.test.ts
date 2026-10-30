import { localDbUrl } from "@/test/local-db";
import { afterAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { appendOps, createResume, loadResume } from "@/lib/resume/store";
import type { Owner } from "@/lib/resume/owner-types";
import type { DeepAnalysis, GroundedSuggestion } from "@/lib/optimizer/types";
import { applySuggestions, contentHash, getTailoring, listTailorings, saveTailoring, TailorError } from "./store";

const run = localDbUrl() ? describe : describe.skip;
const users: string[] = [];
const rid = () => randomBytes(5).toString("hex");

async function setup(credits = 2) {
  const userId = `user_tailor_${rid()}`;
  users.push(userId);
  await prisma.user.create({ data: { id: userId, email: `${userId}@test.invalid`, credits } });
  const owner: Owner = { userId, anonKeyHash: null };
  const cv = await createResume(owner);
  const seeded = await appendOps(cv.id, owner, [
    { clientOpId: `t:${rid()}aaaa`, name: "add_experience", input: { company: "Acme", role: "PM", description: ["Ran checkout", "Hired two"] } },
    { clientOpId: `t:${rid()}bbbb`, name: "set_skills", input: { skills: ["SQL"] } },
  ], "user");
  return { userId, owner, cvId: cv.id, content: seeded.doc.content };
}

const sug = (id: string, over: Partial<GroundedSuggestion>): GroundedSuggestion => ({
  id, title: id, rationale: "", linkedRequirementIds: [], category: "impact", scoreImpact: 5, section: "Experience", before: null, after: "", patch: null, grounded: false, ...over,
});

function analysisFor(): DeepAnalysis {
  return {
    schemaVersion: 2,
    scoreComparison: { original: { total: 58, breakdown: { ats: 60, impact: 50, clarity: 64 } }, optimized: { total: 71, breakdown: { ats: 72, impact: 68, clarity: 73 } }, improvement: 13 },
    overallScore: 58, summary: "", strengths: [], improvements: [], missingKeySkills: [], suggestedChanges: [], keywords: { present: [], missing: [], added: [] }, optimizedCV: "",
    jdRequirements: [], coverage: [], sectionCritiques: [],
    suggestions: [
      sug("s1", { grounded: true, before: "Ran checkout", after: "Led checkout redesign, +18% conversion", patch: { name: "update_experience_bullet", input: { index: 0, bulletIndex: 0, text: "Led checkout redesign, +18% conversion" } } }),
      sug("s2", { grounded: true, after: "SQL, A/B testing", patch: { name: "set_skills", input: { skills: ["SQL", "A/B testing"] } } }),
      sug("s3", { grounded: false, after: "Mention a metric you don't have", patch: null }),
    ],
    resumeData: {} as DeepAnalysis["resumeData"], optimizedResumeData: {} as DeepAnalysis["optimizedResumeData"], parseDegraded: false,
  };
}

const credits = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id } })).credits;

run("tailoring store (local Postgres)", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });

  it("saves a run and charges one credit in the same transaction", async () => {
    const t = await setup(2);
    const saved = await saveTailoring({ userId: t.userId, resumeId: t.cvId, jobTitle: "Senior PM", company: "Globex", jdText: "x".repeat(200), analysis: analysisFor(), baseHash: contentHash(t.content) });
    expect(saved.charged).toBe(1);
    expect(await credits(t.userId)).toBe(1);
    expect((await listTailorings(t.userId, t.cvId))[0]).toMatchObject({ id: saved.id, company: "Globex", scoreOriginal: 58, scoreOptimized: 71, applied: 0 });
    expect((await getTailoring(t.userId, t.cvId, saved.id)).applicable).toBe(true);
  });

  it("with no credits nothing is saved", async () => {
    const t = await setup(0);
    await expect(saveTailoring({ userId: t.userId, resumeId: t.cvId, jobTitle: "", company: "", jdText: "x".repeat(200), analysis: analysisFor(), baseHash: contentHash(t.content) })).rejects.toThrow();
    expect(await prisma.tailoring.count({ where: { userId: t.userId } })).toBe(0);
  });

  it("applies only grounded suggestions, once each, and saves a version", async () => {
    const t = await setup(2);
    const { id } = await saveTailoring({ userId: t.userId, resumeId: t.cvId, jobTitle: "Senior PM", company: "Globex", jdText: "x".repeat(200), analysis: analysisFor(), baseHash: contentHash(t.content) });

    await expect(applySuggestions(t.userId, t.cvId, id, ["s3"])).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const r = await applySuggestions(t.userId, t.cvId, id, ["s1"]);
    expect(r.doc.content.experience[0].description).toEqual(["Led checkout redesign, +18% conversion", "Hired two"]);
    expect(r.version).toMatchObject({ number: 1 });
    expect((await prisma.resumeVersion.findFirstOrThrow({ where: { resumeId: t.cvId } })).label).toBe("Tailored for Globex");

    // Applying more later works (the CV only changed by our own patches)...
    const r2 = await applySuggestions(t.userId, t.cvId, id, ["s1", "s2"]);
    expect(r2.applied).toHaveLength(1);
    expect(r2.doc.content.skills).toEqual(["SQL", "A/B testing"]);
    // ...and a repeat applies nothing.
    expect((await applySuggestions(t.userId, t.cvId, id, ["s1", "s2"])).applied).toEqual([]);
    const ops = await prisma.resumeOp.findMany({ where: { resumeId: t.cvId, actor: "tailor" } });
    expect(ops.map((o) => o.clientOpId).sort()).toEqual([`tl:${id}:s1`, `tl:${id}:s2`]);
  });

  it("refuses to apply once the CV changed another way (patches are index-addressed)", async () => {
    const t = await setup(2);
    const { id } = await saveTailoring({ userId: t.userId, resumeId: t.cvId, jobTitle: "", company: "", jdText: "x".repeat(200), analysis: analysisFor(), baseHash: contentHash(t.content) });
    await appendOps(t.cvId, t.owner, [{ clientOpId: `t:${rid()}cccc`, name: "add_experience", input: { company: "Initech", role: "Analyst" } }], "user");
    const err = await applySuggestions(t.userId, t.cvId, id, ["s1"]).catch((e) => e);
    expect(err).toBeInstanceOf(TailorError);
    expect(err.code).toBe("STALE");
    expect((await getTailoring(t.userId, t.cvId, id)).applicable).toBe(false);
    expect((await loadResume(t.cvId, t.owner))!.doc.content.experience[0].description).toEqual(["Ran checkout", "Hired two"]);
  });

  it("another user can't read or apply someone's run", async () => {
    const a = await setup(2);
    const b = await setup(2);
    const { id } = await saveTailoring({ userId: a.userId, resumeId: a.cvId, jobTitle: "", company: "", jdText: "x".repeat(200), analysis: analysisFor(), baseHash: contentHash(a.content) });
    await expect(getTailoring(b.userId, a.cvId, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(applySuggestions(b.userId, a.cvId, id, ["s1"])).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("contentHash", () => {
  it("is the same for equal content built in a different key order", async () => {
    const { emptyContent } = await import("@/lib/resume/document");
    const a = { ...emptyContent(), skills: ["SQL"] };
    // Same content, keys inserted in reverse order.
    const b = Object.fromEntries(Object.entries(a).reverse()) as unknown as typeof a;
    expect(contentHash(a)).toBe(contentHash(b));
    expect(contentHash(a)).not.toBe(contentHash({ ...a, skills: ["SQL", "Go"] }));
  });
});

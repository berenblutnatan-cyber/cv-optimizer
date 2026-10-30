import { localDbUrl } from "@/test/local-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { appendOps, claimDrafts, createResume, createVersion, getVersion, listResumeCards, listResumes, listVersions, loadResume, renameVersion, restoreVersion, StoreError } from "./store";
import type { Owner } from "./owner-types";

const run = localDbUrl() ? describe : describe.skip;
const anon = (): Owner => ({ userId: null, anonKeyHash: randomBytes(32).toString("hex") });
const op = (name: string, input: Record<string, unknown>) => ({ clientOpId: `t:${randomBytes(8).toString("hex")}`, name, input });

run("resume store (local Postgres)", () => {
  const userId = `user_test_${randomBytes(6).toString("hex")}`;

  beforeAll(async () => {
    await prisma.user.create({ data: { id: userId, email: `${userId}@test.invalid` } });
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("only the owner can read a draft", async () => {
    const me = anon();
    const { id } = await createResume(me);
    expect(await loadResume(id, me)).not.toBeNull();
    expect(await loadResume(id, anon())).toBeNull();
    expect(await loadResume(id, { userId, anonKeyHash: null })).toBeNull();
  });

  it("applies ops, logs them in order, and returns the authoritative document", async () => {
    const me = anon();
    const { id } = await createResume(me);
    const res = await appendOps(id, me, [op("update_personal_info", { name: "Dana", title: "PM" }), op("add_experience", { company: "Acme", role: "PM" })], "user");
    expect(res.lastSeq).toBe(2);
    expect(res.doc.content.personalInfo.name).toBe("Dana");
    const row = await prisma.resume.findUniqueOrThrow({ where: { id } });
    expect(row.title).toBe("Dana — PM");
    expect(row.dataVersion).toBe(2);
    const log = await prisma.resumeOp.findMany({ where: { resumeId: id }, orderBy: { seq: "asc" } });
    expect(log.map((l) => [l.seq, l.toolName])).toEqual([
      [1, "update_personal_info"],
      [2, "add_experience"],
    ]);
  });

  it("is idempotent: a retried batch never applies twice", async () => {
    const me = anon();
    const { id } = await createResume(me);
    const batch = [op("add_experience", { company: "Acme", role: "PM" })];
    await appendOps(id, me, batch, "user");
    const retry = await appendOps(id, me, batch, "user");
    expect(retry.applied).toEqual([]);
    expect(retry.skipped).toEqual([batch[0].clientOpId]);
    expect(retry.doc.content.experience).toHaveLength(1);
  });

  it("does not log no-op operations", async () => {
    const me = anon();
    const { id } = await createResume(me);
    const res = await appendOps(id, me, [op("update_experience", { index: 5, role: "X" }), op("not_a_tool", {})], "chat");
    expect(res.applied).toEqual([]);
    expect(res.lastSeq).toBe(0);
    expect(await prisma.resumeOp.count({ where: { resumeId: id } })).toBe(0);
  });

  // NOTE: the local dev database (prisma dev / PGlite) executes transactions
  // one at a time, so on it this test passes even without the row lock. It
  // proves the lock only against a real multi-connection Postgres (CI). The
  // (resumeId, seq) unique index is the structural backstop either way: a
  // lost update would fail loudly, never corrupt silently.
  it("serializes concurrent writers: no lost update, unique sequence", async () => {
    const me = anon();
    const { id } = await createResume(me);
    await Promise.all(
      Array.from({ length: 6 }, (_, i) => appendOps(id, me, [op("add_experience", { company: `Co${i}`, role: "Eng" })], i % 2 ? "chat" : "user")),
    );
    const final = await loadResume(id, me);
    expect(final!.doc.content.experience).toHaveLength(6);
    expect(final!.lastSeq).toBe(6);
    const seqs = (await prisma.resumeOp.findMany({ where: { resumeId: id }, select: { seq: true } })).map((s) => s.seq).sort((a, b) => a - b);
    expect(seqs).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("rejects malformed batches and other owners' CVs", async () => {
    const me = anon();
    const { id } = await createResume(me);
    await expect(appendOps(id, me, [], "user")).rejects.toBeInstanceOf(StoreError);
    await expect(appendOps(id, me, [{ clientOpId: "x", name: "add_experience", input: {} }], "user")).rejects.toThrow("Bad clientOpId");
    await expect(appendOps(id, me, [op("add_experience", { blob: "x".repeat(30_000) })], "user")).rejects.toThrow("too large");
    await expect(appendOps(id, anon(), [op("add_experience", { company: "A", role: "B" })], "user")).rejects.toThrow("not found");
  });

  it("saves, lists and restores versions; a restore is itself undoable", async () => {
    const me = anon();
    const { id } = await createResume(me);
    await appendOps(id, me, [op("update_summary", { summary: "First version of the summary, long enough." })], "user");
    const v1 = await createVersion(id, me, { label: "Base", createdBy: "user" });
    await appendOps(id, me, [op("update_summary", { summary: "Rewritten summary that replaced the first." })], "user");
    const restored = await restoreVersion(id, me, v1.id);
    expect(restored.doc.content.summary).toBe("First version of the summary, long enough.");
    const versions = await listVersions(id, me);
    expect(versions.map((v) => v.label)).toEqual(["Before restoring v1", "Base"]);
  });

  it("reads, renames and restores a version, and only for its owner", async () => {
    const me = anon();
    const { id } = await createResume(me);
    await appendOps(id, me, [op("update_personal_info", { name: "Dana" })], "user");
    const v1 = await createVersion(id, me, { createdBy: "import", label: "Imported from cv.pdf" });
    await appendOps(id, me, [op("update_personal_info", { name: "Dana Levi" })], "user");

    const got = await getVersion(id, me, v1.id);
    expect(got.doc.content.personalInfo.name).toBe("Dana");
    expect(got.createdBy).toBe("import");
    await expect(getVersion(id, anon(), v1.id)).rejects.toBeInstanceOf(StoreError);

    const renamed = await renameVersion(id, me, v1.id, "  Original upload  ");
    expect(renamed.label).toBe("Original upload");
    await expect(renameVersion(id, anon(), v1.id, "hijack")).rejects.toBeInstanceOf(StoreError);
    expect((await renameVersion(id, me, v1.id, "")).label).toBeNull();

    const before = (await loadResume(id, me))!.lastSeq;
    const out = await restoreVersion(id, me, v1.id);
    expect(out.restored).toBe(1);
    expect(out.lastSeq).toBe(before + 1);
    expect(out.doc.content.personalInfo.name).toBe("Dana");
    // The backup holds what was there before the restore, so the restore can be undone.
    const backup = await getVersion(id, me, out.backup!.id);
    expect(backup.doc.content.personalInfo.name).toBe("Dana Levi");
    const undone = await restoreVersion(id, me, out.backup!.id);
    expect(undone.doc.content.personalInfo.name).toBe("Dana Levi");
    await expect(restoreVersion(id, anon(), v1.id)).rejects.toBeInstanceOf(StoreError);
  });

  it("undoing a restore puts the CV back and leaves the history as it was", async () => {
    const me = anon();
    const { id } = await createResume(me);
    await appendOps(id, me, [op("update_personal_info", { name: "Original" })], "user");
    const v1 = await createVersion(id, me, { createdBy: "user" });
    await appendOps(id, me, [op("update_personal_info", { name: "Edited" })], "user");

    const restored = await restoreVersion(id, me, v1.id);
    expect(restored.doc.content.personalInfo.name).toBe("Original");
    expect((await listVersions(id, me)).map((v) => v.number)).toEqual([2, 1]);

    const undone = await restoreVersion(id, me, restored.backup!.id, { undoOf: v1.id });
    expect(undone.doc.content.personalInfo.name).toBe("Edited");
    expect(undone.backup).toBeNull();
    expect((await listVersions(id, me)).map((v) => v.number)).toEqual([1]);
    expect((await loadResume(id, me))!.doc.content.personalInfo.name).toBe("Edited");
  });

  it("an undo after new edits is an ordinary restore, so the edits are kept as a version", async () => {
    const me = anon();
    const { id } = await createResume(me);
    await appendOps(id, me, [op("update_personal_info", { name: "Original" })], "user");
    const v1 = await createVersion(id, me, { createdBy: "user" });
    await appendOps(id, me, [op("update_personal_info", { name: "Edited" })], "user");
    const restored = await restoreVersion(id, me, v1.id);
    await appendOps(id, me, [op("update_summary", { summary: "Typed after the restore, must not be lost." })], "user");

    const undone = await restoreVersion(id, me, restored.backup!.id, { undoOf: v1.id });
    expect(undone.doc.content.personalInfo.name).toBe("Edited");
    expect(undone.backup).not.toBeNull();
    const kept = await getVersion(id, me, undone.backup!.id);
    expect(kept.doc.content.summary).toBe("Typed after the restore, must not be lost.");
  });

  // PGlite (prisma dev) is a single-connection wasm Postgres: it cannot run
  // two transactions at once, so this only means something on real Postgres (CI).
  it.skipIf(process.env.REAL_POSTGRES !== "1")("a restore and a concurrent edit both land, in one order (real Postgres only)", async () => {
    const me = anon();
    const { id } = await createResume(me);
    const v1 = await createVersion(id, me, { createdBy: "user" });
    await Promise.all([restoreVersion(id, me, v1.id), appendOps(id, me, [op("set_skills", { skills: ["SQL"] })], "user")]);
    const log = await prisma.resumeOp.findMany({ where: { resumeId: id }, orderBy: { seq: "asc" }, select: { seq: true } });
    expect(log.map((l) => l.seq)).toEqual(log.map((_, i) => i + 1)); // no gaps, no duplicate seq
  });

  it("lists CV cards with their documents", async () => {
    const me = anon();
    const { id } = await createResume(me);
    await appendOps(id, me, [op("update_personal_info", { name: "Card Test" }), op("set_design", { template: "executive" })], "user");
    const cards = await listResumeCards(me);
    expect(cards).toHaveLength(1);
    expect(cards[0].doc.content.personalInfo.name).toBe("Card Test");
    expect(cards[0].doc.design.template).toBe("executive");
  });

  it("claims a signed-out draft into the account on sign-in", async () => {
    const me = anon();
    const { id } = await createResume(me);
    expect(await claimDrafts(userId, me.anonKeyHash!)).toBe(1);
    expect(await loadResume(id, me)).toBeNull();
    const asUser: Owner = { userId, anonKeyHash: null };
    expect(await loadResume(id, asUser)).not.toBeNull();
    expect((await listResumes(asUser)).map((r) => r.id)).toContain(id);
  });

  it("an expired draft is unreachable", async () => {
    const me = anon();
    const { id } = await createResume(me);
    await prisma.resume.update({ where: { id }, data: { anonExpiresAt: new Date(Date.now() - 1000) } });
    expect(await loadResume(id, me)).toBeNull();
  });

  it("the database refuses a CV with no owner", async () => {
    await expect(
      prisma.$executeRawUnsafe(`INSERT INTO "Resume" ("id","title","data","template","updatedAt") VALUES ('orphan-${randomBytes(4).toString("hex")}','x','{}','minimalist',NOW())`),
    ).rejects.toThrow(/Resume_owner_chk/);
  });

  it("deleting a user deletes their CVs (was RESTRICT)", async () => {
    const tmp = `user_tmp_${randomBytes(6).toString("hex")}`;
    await prisma.user.create({ data: { id: tmp, email: `${tmp}@test.invalid` } });
    const { id } = await createResume({ userId: tmp, anonKeyHash: null });
    await prisma.user.delete({ where: { id: tmp } });
    expect(await prisma.resume.findUnique({ where: { id } })).toBeNull();
  });
});

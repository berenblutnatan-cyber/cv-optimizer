import { localDbUrl } from "@/test/local-db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";

// The legacy builder's autosave must never touch a v2 CV. It used to read and
// update "the user's latest Resume row" whatever its shape, so visiting any
// legacy page replaced a v2 CV with the browser's old local draft.

const userId = `user_legacy_${randomBytes(6).toString("hex")}`;
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId }) }));

const run = localDbUrl() ? describe : describe.skip;

run("legacy /api/resume vs v2 documents (local Postgres)", () => {
  let GET: typeof import("./route").GET;
  let PUT: typeof import("./route").PUT;
  let prisma: typeof import("@/lib/prisma").prisma;
  let store: typeof import("@/lib/resume/store");

  beforeAll(async () => {
    ({ GET, PUT } = await import("./route"));
    ({ prisma } = await import("@/lib/prisma"));
    store = await import("@/lib/resume/store");
    await prisma.user.create({ data: { id: userId, email: `${userId}@test.invalid` } });
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  const put = (resumeData: unknown) => PUT(new Request("http://test/api/resume", { method: "PUT", body: JSON.stringify({ resumeData }) }) as never);

  it("never reads or overwrites a v2 CV, even when it is the newest row", async () => {
    const owner = { userId, anonKeyHash: null };
    const v2 = await store.createResume(owner);
    await store.appendOps(v2.id, owner, [{ clientOpId: `t:${randomBytes(5).toString("hex")}`, name: "update_personal_info", input: { name: "Dana (v2)" } }], "user");
    const before = await prisma.resume.findUniqueOrThrow({ where: { id: v2.id } });
    expect(before.dataVersion).toBe(2);

    // Nothing legacy yet: the legacy builder sees no CV (not the v2 one).
    expect(await (await GET()).json()).toMatchObject({ resumeData: null });

    // The autosave pushes an old local draft.
    expect((await put({ personalInfo: { name: "Old draft" } })).status).toBe(200);

    const after = await prisma.resume.findUniqueOrThrow({ where: { id: v2.id } });
    expect(after.data).toEqual(before.data);
    expect(after.template).toBe(before.template);
    const loaded = await store.loadResume(v2.id, owner);
    expect(loaded!.doc.content.personalInfo.name).toBe("Dana (v2)");

    // The draft became a legacy row of its own, which the legacy builder reads back.
    const legacy = await prisma.resume.findMany({ where: { userId, dataVersion: 1 } });
    expect(legacy).toHaveLength(1);
    expect((await (await GET()).json()).resumeData.personalInfo.name).toBe("Old draft");

    // Later autosaves update that same legacy row, still not the v2 one.
    await put({ personalInfo: { name: "Newer draft" } });
    expect(await prisma.resume.count({ where: { userId, dataVersion: 1 } })).toBe(1);
    expect((await prisma.resume.findUniqueOrThrow({ where: { id: v2.id } })).data).toEqual(before.data);
  });
});

import { localDbUrl } from "@/test/local-db";
import { afterAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { drainVoice, unlimitedSecondsUsed } from "./sessions";

// Pre-v2 voice sessions (OpenAI Realtime, metadata only) share the table.
// They must not fill the cron's settle batch (or real calls never settle),
// and must not count against an Unlimited user's voice fair use.

const run = localDbUrl() ? describe : describe.skip;
const userId = `user_vleg_${randomBytes(6).toString("hex")}`;

run("legacy voice rows (local Postgres)", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("are closed by the migration, ignored by the cron and by fair use", async () => {
    await prisma.user.create({ data: { id: userId, email: `${userId}@test.invalid` } });
    // As the legacy app wrote them; the new columns take their defaults.
    const legacy = await Promise.all(
      [1, 2, 3].map(() => prisma.voiceSession.create({ data: { userId, durationSec: 600, finalized: true, status: "ended" } })),
    );
    expect(await unlimitedSecondsUsed(prisma, userId)).toBe(0);

    // The migration's step 4, re-run (it is idempotent).
    const sql = readFileSync("prisma/manual-migrations/2026-11-02-v2-voice-sessions.sql", "utf8");
    await prisma.$executeRawUnsafe(sql.slice(sql.lastIndexOf('UPDATE "VoiceSession" s')));
    const after = await prisma.voiceSession.findMany({ where: { id: { in: legacy.map((l) => l.id) } } });
    expect(after.every((s) => s.status === "reconciled" && s.reconciledAt)).toBe(true);

    // Even if a row were left "ended", the cron's settle pass skips it.
    await prisma.voiceSession.update({ where: { id: legacy[0].id }, data: { status: "ended" } });
    const out = await drainVoice(null);
    expect(out.settled).toBe(0);
    expect((await prisma.voiceSession.findUniqueOrThrow({ where: { id: legacy[0].id } })).status).toBe("ended");
  });
});

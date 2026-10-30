import "server-only";
import { prisma } from "@/lib/prisma";
import type { ToolId } from "./tools";

// One free use per tool per day (UTC), per account or, signed out, per IP.
// Claimed before the model call with one insert (two tabs can't both get it),
// released if the run fails, so a failure never costs the free use. Stored in
// the RateLimitBucket table: no KV needed, pruned by the daily cron.

const today = (now = new Date()) => now.toISOString().slice(0, 10);
const keyFor = (tool: ToolId, who: string, now?: Date) => `tkfree:${tool}:${who}:${today(now)}`;

/** True if this call got today's free use for `tool`. */
export async function claimFreeUse(tool: ToolId, who: string, now?: Date): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ key: string }[]>`
    INSERT INTO "RateLimitBucket" ("key", "windowStart", "count") VALUES (${keyFor(tool, who, now)}, NOW(), 1)
    ON CONFLICT ("key") DO NOTHING
    RETURNING "key"`;
  return rows.length === 1;
}

/** Give the free use back (the run failed). */
export async function releaseFreeUse(tool: ToolId, who: string, now?: Date): Promise<void> {
  await prisma.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "key" = ${keyFor(tool, who, now)}`;
}

/** Which tools still have today's free use, for the labels on the page. */
export async function freeToolsLeft(tools: readonly ToolId[], who: string, now?: Date): Promise<ToolId[]> {
  const keys = tools.map((t) => keyFor(t, who, now));
  const used = await prisma.rateLimitBucket.findMany({ where: { key: { in: keys } }, select: { key: true } });
  const usedSet = new Set(used.map((u) => u.key));
  return tools.filter((t) => !usedSet.has(keyFor(t, who, now)));
}

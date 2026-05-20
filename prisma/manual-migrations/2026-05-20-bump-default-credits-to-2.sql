-- Bumps the User.credits default from 1 to 2 in the database to match prisma/schema.prisma.
-- Tops up recent signups who experienced the 1-credit regime (commit fb6d4aa, 2026-05-19)
-- so they get a second shot at activation before hitting the paywall.
--
-- Scope of backfill: users created on/after 2026-05-19 who have NOT made a purchase yet,
-- and who currently have <= 1 credit remaining. Adds exactly 1 credit.
--
-- Idempotent: safe to re-run — the WHERE clauses prevent double-topup if a user has
-- since spent the bonus or purchased credits.

ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 2;

UPDATE "User"
SET "credits" = "credits" + 1, "updatedAt" = NOW()
WHERE "createdAt" >= TIMESTAMP '2026-05-19 00:00:00'
  AND "credits" <= 1
  AND NOT EXISTS (
    SELECT 1 FROM "Purchase" p WHERE p."userId" = "User"."id"
  );

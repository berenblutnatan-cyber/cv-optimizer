-- Hired v2, M3: credit ledger, Polar webhook idempotency, subscription ordering.
-- Apply after 2026-10-31-v2-import-versions.sql. Idempotent (safe to re-run).
-- Review before prod: step 2 changes balances of any user whose credits are
-- negative today (a past race let them go below zero). Count them first:
--   SELECT COUNT(*) FROM "User" WHERE credits < 0;

-- 1. Tables.
CREATE TABLE IF NOT EXISTS "CreditLedger" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "userId"         TEXT NOT NULL,
  "delta"          INTEGER NOT NULL,
  "balanceAfter"   INTEGER NOT NULL,
  "reason"         TEXT NOT NULL,
  "refType"        TEXT,
  "refId"          TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditLedger_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CreditLedger_reason_chk" CHECK ("reason" ~ '^[a-z_]{2,40}$'),
  CONSTRAINT "CreditLedger_balance_chk" CHECK ("balanceAfter" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "CreditLedger_idempotencyKey_key" ON "CreditLedger"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "CreditLedger_userId_createdAt_idx" ON "CreditLedger"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "PolarWebhookEvent" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "type"        TEXT NOT NULL,
  "receivedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "payload"     JSONB NOT NULL
);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionSyncedAt" TIMESTAMP(3);

-- 2. No negative balances, ever. Clamp the existing ones (logged as a
--    correction), then make the database refuse them.
INSERT INTO "CreditLedger" ("id", "userId", "delta", "balanceAfter", "reason", "idempotencyKey")
SELECT gen_random_uuid()::text, "id", -"credits", 0, 'correction', 'clamp-negative:' || "id"
FROM "User" WHERE "credits" < 0
ON CONFLICT ("idempotencyKey") DO NOTHING;
UPDATE "User" SET "credits" = 0 WHERE "credits" < 0;

DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_credits_nonnegative_chk" CHECK ("credits" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Opening balance: one row per existing user, so SUM(delta) = credits from
--    day one. (A clamped user's opening row is their pre-clamp balance; the
--    correction above brings the sum to 0.)
INSERT INTO "CreditLedger" ("id", "userId", "delta", "balanceAfter", "reason", "idempotencyKey")
SELECT gen_random_uuid()::text, u."id",
       u."credits" + COALESCE((SELECT -l."delta" FROM "CreditLedger" l WHERE l."idempotencyKey" = 'clamp-negative:' || u."id"), 0),
       u."credits", 'opening', 'opening:' || u."id"
FROM "User" u
WHERE NOT EXISTS (SELECT 1 FROM "CreditLedger" l WHERE l."userId" = u."id" AND l."reason" IN ('opening', 'signup'))
  AND (u."credits" <> 0 OR EXISTS (SELECT 1 FROM "CreditLedger" l WHERE l."idempotencyKey" = 'clamp-negative:' || u."id"))
ON CONFLICT ("idempotencyKey") DO NOTHING;

-- 4. Signup grant: whatever path creates a User row (Clerk sync, webhook,
--    first API call), its starting credits are recorded in the ledger.
CREATE OR REPLACE FUNCTION "credit_ledger_on_user_insert"() RETURNS trigger AS $$
BEGIN
  IF NEW."credits" <> 0 THEN
    INSERT INTO "CreditLedger" ("id", "userId", "delta", "balanceAfter", "reason", "idempotencyKey")
    VALUES (gen_random_uuid()::text, NEW."id", NEW."credits", NEW."credits", 'signup', 'signup:' || NEW."id")
    ON CONFLICT ("idempotencyKey") DO NOTHING;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "User_credit_ledger_signup" ON "User";
CREATE TRIGGER "User_credit_ledger_signup" AFTER INSERT ON "User"
  FOR EACH ROW EXECUTE FUNCTION "credit_ledger_on_user_insert"();

-- Bring production up to main's schema before the v2 migrations run: earlier
-- manual migrations were never applied there. Idempotent. Safe while the
-- current app is live: it already expects all of this.

-- Job tracker (2026-06-23-add-job-application.sql, never applied).
CREATE TABLE IF NOT EXISTS "JobApplication" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "company"   TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "url"       TEXT,
  "jdText"    TEXT,
  "location"  TEXT,
  "salary"    TEXT,
  "status"    TEXT NOT NULL DEFAULT 'BOOKMARKED',
  "notes"     TEXT,
  "appliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobApplication_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "JobApplication_userId_updatedAt_idx"
  ON "JobApplication"("userId", "updatedAt");

-- Purchases moved from PayPal to Polar. Old order ids are kept, prefixed so
-- they can never collide with a Polar id.
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "polarOrderId" TEXT;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'Purchase' AND column_name = 'paypalOrderId') THEN
    UPDATE "Purchase" SET "polarOrderId" = 'paypal:' || "paypalOrderId"
      WHERE "paypalOrderId" IS NOT NULL AND "polarOrderId" IS NULL;
    ALTER TABLE "Purchase" DROP COLUMN "paypalOrderId";
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Purchase_polarOrderId_key" ON "Purchase"("polarOrderId");

ALTER TABLE "GeneratedResume" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Deleting a user removes their rows.
ALTER TABLE "Analysis" DROP CONSTRAINT IF EXISTS "Analysis_userId_fkey";
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Improvement" DROP CONSTRAINT IF EXISTS "Improvement_analysisId_fkey";
ALTER TABLE "Improvement" ADD CONSTRAINT "Improvement_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedResume" DROP CONSTRAINT IF EXISTS "GeneratedResume_userId_fkey";
ALTER TABLE "GeneratedResume" ADD CONSTRAINT "GeneratedResume_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoiceSession" DROP CONSTRAINT IF EXISTS "VoiceSession_userId_fkey";
ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OptimizationLog" DROP CONSTRAINT IF EXISTS "OptimizationLog_userId_fkey";
ALTER TABLE "OptimizationLog" ADD CONSTRAINT "OptimizationLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

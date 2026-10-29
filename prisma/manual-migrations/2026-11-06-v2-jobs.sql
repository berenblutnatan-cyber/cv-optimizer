-- Hired v2, M7: the jobs tracker grows into the hub for one application (the
-- CV it uses, the next step, tailorings, interviews, a cover letter).
-- Additive only: the legacy /applications page keeps working on the same rows.
-- Apply after 2026-11-05-v2-rate-limits.sql. Idempotent.

ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "resumeId" TEXT;
ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "nextStep" TEXT;
ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "nextStepAt" TIMESTAMP(3);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'JobApplication_resumeId_fkey') THEN
    ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_resumeId_fkey"
      FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  -- New rows only (NOT VALID): a stray legacy value can't block the migration.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'JobApplication_status_check') THEN
    ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_status_check"
      CHECK ("status" IN ('BOOKMARKED', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED')) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "JobApplication_resumeId_idx" ON "JobApplication" ("resumeId");

-- A cover letter written from one CV for one job. Grounded: numbers that are
-- on neither the CV nor the job post are kept in "flags" for the user to check.
CREATE TABLE IF NOT EXISTS "CoverLetter" (
  "id"               TEXT NOT NULL PRIMARY KEY,
  "userId"           TEXT NOT NULL,
  "jobApplicationId" TEXT,
  "resumeId"         TEXT,
  "company"          TEXT NOT NULL DEFAULT '',
  "jobTitle"         TEXT NOT NULL DEFAULT '',
  "body"             TEXT NOT NULL,
  "flags"            JSONB NOT NULL DEFAULT '[]'::jsonb,
  "creditsCharged"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoverLetter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CoverLetter_jobApplicationId_fkey" FOREIGN KEY ("jobApplicationId") REFERENCES "JobApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CoverLetter_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CoverLetter_body_len" CHECK (char_length("body") <= 20000)
);

CREATE INDEX IF NOT EXISTS "CoverLetter_userId_createdAt_idx" ON "CoverLetter" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "CoverLetter_jobApplicationId_idx" ON "CoverLetter" ("jobApplicationId");

-- Hired v2, M5: tailoring a CV to one job (coverage, grounded suggestions, apply).
-- Apply after 2026-11-02-v2-voice-sessions.sql. Idempotent (safe to re-run).

CREATE TABLE IF NOT EXISTS "Tailoring" (
  "id"                   TEXT NOT NULL PRIMARY KEY,
  "userId"               TEXT NOT NULL,
  "resumeId"             TEXT NOT NULL,
  "jobApplicationId"     TEXT,
  "jobTitle"             TEXT NOT NULL DEFAULT '',
  "company"              TEXT NOT NULL DEFAULT '',
  "jdText"               TEXT NOT NULL,
  "jdHash"               TEXT NOT NULL,
  "analysis"             JSONB NOT NULL,
  "scoreOriginal"        INTEGER NOT NULL,
  "scoreOptimized"       INTEGER NOT NULL,
  "baseHash"             TEXT NOT NULL,
  "appliedHash"          TEXT,
  "appliedSuggestionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "resultVersionId"      TEXT,
  "creditsCharged"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tailoring_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Tailoring_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Tailoring_jobApplicationId_fkey" FOREIGN KEY ("jobApplicationId") REFERENCES "JobApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Tailoring_scores_chk" CHECK ("scoreOriginal" BETWEEN 0 AND 100 AND "scoreOptimized" BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS "Tailoring_resumeId_createdAt_idx" ON "Tailoring"("resumeId", "createdAt");
CREATE INDEX IF NOT EXISTS "Tailoring_userId_createdAt_idx" ON "Tailoring"("userId", "createdAt");

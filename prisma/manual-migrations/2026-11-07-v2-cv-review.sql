-- Hired v2: the free deep read of a CV against its target job, shown after upload.
-- Apply after 2026-11-06-v2-jobs.sql. Idempotent (safe to re-run).

CREATE TABLE IF NOT EXISTS "CvReview" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "resumeId"    TEXT NOT NULL,
  "readHash"    TEXT NOT NULL,
  "targetTitle" TEXT NOT NULL DEFAULT '',
  "audit"       JSONB NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CvReview_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CvReview_resumeId_readHash_key" ON "CvReview"("resumeId", "readHash");
CREATE INDEX IF NOT EXISTS "CvReview_resumeId_createdAt_idx" ON "CvReview"("resumeId", "createdAt");

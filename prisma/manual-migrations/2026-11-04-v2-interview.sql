-- Hired v2, M6: interview practice (questions from the CV + the job, voice or
-- typed answers, a scored debrief). Apply after 2026-11-03-v2-tailoring.sql.
-- Idempotent (safe to re-run).

CREATE TABLE IF NOT EXISTS "InterviewSession" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "userId"         TEXT NOT NULL,
  "resumeId"       TEXT,
  "tailoringId"    TEXT,
  "jobTitle"       TEXT NOT NULL DEFAULT '',
  "company"        TEXT NOT NULL DEFAULT '',
  "jdText"         TEXT NOT NULL,
  "mode"           TEXT NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'ready',
  "questions"      JSONB NOT NULL,
  "answers"        JSONB NOT NULL DEFAULT '[]'::jsonb,
  "report"         JSONB,
  "appliedAdds"    INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "conversationIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "scoringClaimedAt" TIMESTAMP(3),
  "attempts"       INTEGER NOT NULL DEFAULT 0,
  "startedAt"      TIMESTAMP(3),
  "durationSec"    INTEGER,
  "creditsCharged" INTEGER NOT NULL DEFAULT 0,
  "refunded"       BOOLEAN NOT NULL DEFAULT false,
  "error"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InterviewSession_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "InterviewSession_tailoringId_fkey" FOREIGN KEY ("tailoringId") REFERENCES "Tailoring"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "InterviewSession_mode_chk" CHECK ("mode" IN ('voice', 'text')),
  CONSTRAINT "InterviewSession_status_chk" CHECK ("status" IN ('ready', 'live', 'scoring', 'done', 'failed')),
  CONSTRAINT "InterviewSession_attempts_chk" CHECK ("attempts" BETWEEN 0 AND 10),
  CONSTRAINT "InterviewSession_duration_chk" CHECK ("durationSec" IS NULL OR "durationSec" BETWEEN 0 AND 3600)
);
CREATE INDEX IF NOT EXISTS "InterviewSession_userId_createdAt_idx" ON "InterviewSession"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "InterviewSession_conversationIds_idx" ON "InterviewSession" USING GIN ("conversationIds");
CREATE INDEX IF NOT EXISTS "InterviewSession_status_updatedAt_idx" ON "InterviewSession"("status", "updatedAt");

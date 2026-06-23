-- Career-hub redesign: gamification columns on User, plus new Analysis,
-- Improvement, GeneratedResume, and VoiceSession tables. Idempotent.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "xp"           INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "streakDays"   INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "targetRoles"  TEXT[]      NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "Analysis" (
  "id"             TEXT PRIMARY KEY,
  "userId"         TEXT NOT NULL,
  "cvText"         TEXT NOT NULL,
  "jobTitle"       TEXT,
  "overallScore"   INTEGER,
  "optimizedScore" INTEGER,
  "raw"            JSONB NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Analysis_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Analysis_userId_createdAt_idx" ON "Analysis"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "Improvement" (
  "id"          TEXT PRIMARY KEY,
  "analysisId"  TEXT NOT NULL,
  "text"        TEXT NOT NULL,
  "scoreImpact" INTEGER NOT NULL,
  "category"    TEXT NOT NULL,
  "unlocked"    BOOLEAN NOT NULL DEFAULT FALSE,
  "position"    INTEGER NOT NULL,
  CONSTRAINT "Improvement_analysisId_fkey"
    FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Improvement_analysisId_idx" ON "Improvement"("analysisId");

CREATE TABLE IF NOT EXISTS "GeneratedResume" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "role"      TEXT NOT NULL,
  "content"   JSONB NOT NULL,
  "score"     INTEGER,
  "unlocked"  BOOLEAN NOT NULL DEFAULT FALSE,
  "error"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GeneratedResume_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "GeneratedResume_userId_idx"          ON "GeneratedResume"("userId");
CREATE INDEX IF NOT EXISTS "GeneratedResume_userId_role_idx"     ON "GeneratedResume"("userId", "role");

CREATE TABLE IF NOT EXISTS "VoiceSession" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  "durationSec" INTEGER NOT NULL,
  "turns"       INTEGER NOT NULL,
  "finalized"   BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VoiceSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "VoiceSession_userId_idx" ON "VoiceSession"("userId");

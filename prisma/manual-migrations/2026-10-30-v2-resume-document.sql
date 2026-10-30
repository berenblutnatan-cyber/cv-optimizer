-- Hired v2, M1: the CV document, its op log and versions.
-- Additive + idempotent. Apply with a reviewed `prisma db execute` against
-- prod (NEVER `prisma db push` on prod Neon). Verified locally by applying it
-- to the pre-v2 schema and diffing against prisma/schema.prisma (no drift).
--
-- Existing rows are untouched: they keep dataVersion = 1 (bare ResumeData)
-- and lib/resume/document.ts:toDocument() reads them as v2 documents.

-- 1. Resume: owner may be an anonymous draft; op-log high-water mark; source.
ALTER TABLE "Resume" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Resume" ADD COLUMN IF NOT EXISTS "dataVersion"   INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Resume" ADD COLUMN IF NOT EXISTS "lastSeq"       INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Resume" ADD COLUMN IF NOT EXISTS "source"        TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Resume" ADD COLUMN IF NOT EXISTS "anonKeyHash"   TEXT;
ALTER TABLE "Resume" ADD COLUMN IF NOT EXISTS "anonExpiresAt" TIMESTAMP(3);

-- Deleting a user deletes their CVs (was RESTRICT, which blocked account deletion).
ALTER TABLE "Resume" DROP CONSTRAINT IF EXISTS "Resume_userId_fkey";
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$ BEGIN
  ALTER TABLE "Resume" ADD CONSTRAINT "Resume_source_chk"
    CHECK ("source" IN ('manual', 'voice', 'import', 'tailor'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Every CV has exactly one kind of owner.
DO $$ BEGIN
  ALTER TABLE "Resume" ADD CONSTRAINT "Resume_owner_chk"
    CHECK ("userId" IS NOT NULL OR "anonKeyHash" IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Resume_userId_updatedAt_idx" ON "Resume"("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Resume_anonKeyHash_idx" ON "Resume"("anonKeyHash");

-- 2. Versions: immutable snapshots.
CREATE TABLE IF NOT EXISTS "ResumeVersion" (
  "id"        TEXT PRIMARY KEY,
  "resumeId"  TEXT NOT NULL,
  "number"    INTEGER NOT NULL,
  "data"      JSONB NOT NULL,
  "label"     TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResumeVersion_resumeId_fkey"
    FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ResumeVersion_createdBy_chk"
    CHECK ("createdBy" IN ('user', 'chat', 'intake_agent', 'tailor', 'migration'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "ResumeVersion_resumeId_number_key" ON "ResumeVersion"("resumeId", "number");

-- 3. Op log: append-only, idempotent on clientOpId.
CREATE TABLE IF NOT EXISTS "ResumeOp" (
  "id"             TEXT PRIMARY KEY,
  "resumeId"       TEXT NOT NULL,
  "seq"            INTEGER NOT NULL,
  "actor"          TEXT NOT NULL,
  "toolName"       TEXT NOT NULL,
  "input"          JSONB NOT NULL,
  "clientOpId"     TEXT NOT NULL,
  "voiceSessionId" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResumeOp_resumeId_fkey"
    FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ResumeOp_actor_chk"
    CHECK ("actor" IN ('user', 'chat', 'intake_agent', 'tailor'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "ResumeOp_resumeId_seq_key" ON "ResumeOp"("resumeId", "seq");
CREATE UNIQUE INDEX IF NOT EXISTS "ResumeOp_resumeId_clientOpId_key" ON "ResumeOp"("resumeId", "clientOpId");

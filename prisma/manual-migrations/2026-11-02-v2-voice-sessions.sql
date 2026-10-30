-- Hired v2, M4: ElevenLabs voice intake.
-- Apply after 2026-11-01-v2-credit-ledger.sql. Idempotent (safe to re-run).
-- Extends the legacy VoiceSession table in place: existing rows (OpenAI
-- Realtime sessions, metadata only) keep their data and are closed as
-- "reconciled" (step 4), so the cron never mistakes them for v2 calls.

-- 1. VoiceSession: one paid (or free) talk, possibly over several connections.
ALTER TABLE "VoiceSession" ALTER COLUMN "durationSec" SET DEFAULT 0;
ALTER TABLE "VoiceSession" ALTER COLUMN "turns" SET DEFAULT 0;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "kind"           TEXT NOT NULL DEFAULT 'intake';
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "resumeId"       TEXT;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "status"         TEXT NOT NULL DEFAULT 'ended';
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "free"           BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "maxSeconds"     INTEGER NOT NULL DEFAULT 480;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "attempts"       INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "startedAt"      TIMESTAMP(3);
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "endedAt"        TIMESTAMP(3);
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "reconciledAt"   TIMESTAMP(3);
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "creditsCharged" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "refunded"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "error"          TEXT;

DO $$ BEGIN
  ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_resumeId_fkey"
    FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_kind_chk" CHECK ("kind" IN ('intake', 'interview'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_status_chk"
    CHECK ("status" IN ('minted', 'active', 'ended', 'reconciled', 'failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_duration_chk" CHECK ("durationSec" BETWEEN 0 AND 3600);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_attempts_chk" CHECK ("attempts" BETWEEN 0 AND 10);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "VoiceSession_userId_createdAt_idx" ON "VoiceSession"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "VoiceSession_status_createdAt_idx" ON "VoiceSession"("status", "createdAt");

-- 2. VoiceConversation: one ElevenLabs connection (id = their conversation_id).
--    A dropped call reconnects as attempt 1, 2… inside the same session.
CREATE TABLE IF NOT EXISTS "VoiceConversation" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "sessionId"    TEXT NOT NULL,
  "attempt"      INTEGER NOT NULL,
  "startedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "durationSec"  INTEGER,
  "transcript"   JSONB,
  "reconciledAt" TIMESTAMP(3),
  "error"        TEXT,
  CONSTRAINT "VoiceConversation_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "VoiceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "VoiceConversation_attempt_chk" CHECK ("attempt" BETWEEN 0 AND 10),
  CONSTRAINT "VoiceConversation_duration_chk" CHECK ("durationSec" IS NULL OR "durationSec" BETWEEN 0 AND 3600)
);
CREATE UNIQUE INDEX IF NOT EXISTS "VoiceConversation_sessionId_attempt_key" ON "VoiceConversation"("sessionId", "attempt");

-- 3. Raw ElevenLabs webhook deliveries, recorded before processing (replayable).
CREATE TABLE IF NOT EXISTS "ElevenLabsWebhookEvent" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "type"           TEXT NOT NULL,
  "conversationId" TEXT,
  "receivedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt"    TIMESTAMP(3),
  "error"          TEXT,
  "payload"        JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS "ElevenLabsWebhookEvent_conversationId_idx" ON "ElevenLabsWebhookEvent"("conversationId");

-- 4. Legacy rows (never connected through v2: attempts = 0, no conversation)
-- are finished history, not calls waiting to be settled. Left as "ended" they
-- would fill the cron's settle batch forever. Idempotent: v2 sessions always
-- have attempts >= 1 once started.
UPDATE "VoiceSession" s
SET "status" = 'reconciled', "reconciledAt" = COALESCE(s."reconciledAt", s."createdAt")
WHERE s."status" = 'ended'
  AND s."attempts" = 0
  AND NOT EXISTS (SELECT 1 FROM "VoiceConversation" c WHERE c."sessionId" = s."id");

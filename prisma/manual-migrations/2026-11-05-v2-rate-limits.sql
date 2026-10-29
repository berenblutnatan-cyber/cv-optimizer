-- Hired v2: rate-limit counters in Postgres. Production has no KV store; the
-- v2 limiter fails closed without one, which would block every AI route.
-- Postgres is already there, so the counters live here unless KV is set.
-- One row per (limit, caller): a fixed window, reset in place. Idempotent.

CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
  "key"         TEXT NOT NULL PRIMARY KEY,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "count"       INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "RateLimitBucket_count_check" CHECK ("count" >= 0)
);

-- The daily cron prunes buckets whose window ended long ago.
CREATE INDEX IF NOT EXISTS "RateLimitBucket_windowStart_idx" ON "RateLimitBucket" ("windowStart");

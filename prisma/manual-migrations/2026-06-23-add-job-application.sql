-- Job application tracker. Additive + idempotent. Apply with a reviewed
-- `prisma db execute` (NEVER `prisma db push` on prod Neon).

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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobApplication_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "JobApplication_userId_updatedAt_idx"
  ON "JobApplication"("userId", "updatedAt");

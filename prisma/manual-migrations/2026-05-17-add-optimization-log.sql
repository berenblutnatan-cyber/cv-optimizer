-- Adds OptimizationLog table + User.createdAt + Purchase.createdAt indexes for /admin dashboard.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "OptimizationLog" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  "userEmail"   TEXT NOT NULL,
  "jobTitle"    TEXT,
  "companyName" TEXT,
  "matchScore"  INTEGER,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OptimizationLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "OptimizationLog_userId_idx" ON "OptimizationLog"("userId");
CREATE INDEX IF NOT EXISTS "OptimizationLog_createdAt_idx" ON "OptimizationLog"("createdAt");
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "Purchase_createdAt_idx" ON "Purchase"("createdAt");

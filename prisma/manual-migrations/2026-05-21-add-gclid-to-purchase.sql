-- Adds a nullable `gclid` column to Purchase so we can attribute paid orders
-- back to the Google Ads click that drove them. Captured client-side from the
-- ?gclid=... URL param on landing, stored in a 90-day cookie, threaded into
-- the Polar checkout as metadata, then persisted here by the webhook.
--
-- Without this, Google Ads can't verify the Purchase conversion and the goal
-- stays "Misconfigured" — even when the gtag conversion event fires correctly.
--
-- Idempotent.

ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "gclid" TEXT;
CREATE INDEX IF NOT EXISTS "Purchase_gclid_idx" ON "Purchase"("gclid");

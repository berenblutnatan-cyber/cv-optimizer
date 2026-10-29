#!/usr/bin/env bash
# Apply the v2 schema to a database, in the order that keeps the running
# (pre-v2) app working. Nothing runs against a database you didn't name.
#
#   TARGET_DATABASE_URL=postgres://… scripts/v2-prod-migrate.sh check    # read-only (default)
#   TARGET_DATABASE_URL=postgres://… scripts/v2-prod-migrate.sh early    # safe while main is live
#   TARGET_DATABASE_URL=postgres://… scripts/v2-prod-migrate.sh final    # right before the merge
#   TARGET_DATABASE_URL=postgres://… scripts/v2-prod-migrate.sh verify   # schema == schema.prisma
#
# Take a Neon branch/snapshot before "early". Every migration is idempotent,
# so re-running a step is safe. Order matters: 2026-11-01 (credit ledger)
# clamps negative balances and writes opening ledger rows; while the old app
# is still live it changes credits without ledger rows, so apply it last,
# just before the deploy, and check drift after.

set -euo pipefail
cd "$(dirname "$0")/.."

: "${TARGET_DATABASE_URL:?Set TARGET_DATABASE_URL to the database to migrate}"
step="${1:-check}"
host="$(node -e 'console.log(new URL(process.env.TARGET_DATABASE_URL).host)')"
q() { psql "$TARGET_DATABASE_URL" -X -q -t -A -v ON_ERROR_STOP=1 -c "$1"; }
apply() {
  echo "→ $1"
  DATABASE_URL="$TARGET_DATABASE_URL" npx prisma db execute --file "prisma/manual-migrations/$1" >/dev/null
}

EARLY=(
  2026-10-30-v2-resume-document.sql
  2026-10-31-v2-import-versions.sql
  2026-11-02-v2-voice-sessions.sql
  2026-11-03-v2-tailoring.sql
  2026-11-04-v2-interview.sql
  2026-11-05-v2-rate-limits.sql
  2026-11-06-v2-jobs.sql
)
FINAL=(2026-11-01-v2-credit-ledger.sql)

echo "Target: $host"
case "$step" in
  check)
    echo "Users:                  $(q 'SELECT count(*) FROM "User"')"
    echo "Negative balances:      $(q 'SELECT count(*) FROM "User" WHERE credits < 0')  (2026-11-01 sets these to 0)"
    echo "CVs:                    $(q 'SELECT count(*) FROM "Resume"')"
    echo "Longest voice session:  $(q 'SELECT coalesce(max("durationSec"), 0) FROM "VoiceSession"')s  (must be ≤ 3600)"
    echo "Jobs with odd status:   $(q "SELECT count(*) FROM \"JobApplication\" WHERE status NOT IN ('BOOKMARKED','APPLIED','INTERVIEWING','OFFER','REJECTED')")  (kept; new rows are checked)"
    for t in ResumeVersion CreditLedger PolarWebhookEvent VoiceConversation Tailoring InterviewSession RateLimitBucket CoverLetter; do
      echo "Table $t: $(q "SELECT CASE WHEN to_regclass('public.\"$t\"') IS NULL THEN 'missing' ELSE 'present' END")"
    done
    ;;
  early)
    for f in "${EARLY[@]}"; do apply "$f"; done
    echo "Early migrations applied. Apply \"final\" right before merging."
    ;;
  final)
    for f in "${FINAL[@]}"; do apply "$f"; done
    echo "Ledger drift (users whose balance ≠ ledger sum): $(q 'SELECT count(*) FROM "User" u WHERE u.credits <> coalesce((SELECT sum(delta) FROM "CreditLedger" l WHERE l."userId" = u.id), 0)')"
    ;;
  verify)
    DATABASE_URL="$TARGET_DATABASE_URL" npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code >/dev/null \
      && echo "Schema matches schema.prisma." \
      || { echo "Schema differs from schema.prisma:"; DATABASE_URL="$TARGET_DATABASE_URL" npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script; exit 1; }
    ;;
  *)
    echo "Unknown step: $step (check | early | final | verify)" >&2
    exit 2
    ;;
esac

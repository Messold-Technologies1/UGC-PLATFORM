-- Remove the Shortlisted stage from the creator approval flow.
--
-- The flow is now:
--   Building profile -> Self complete -> Awaiting review -> Listed
--
-- Shortlisting was an admin-only side stage between Building profile and
-- Awaiting review: an admin picked a promising incomplete profile, and that
-- creator skipped Self complete when they finished. Every creator now takes the
-- same path, so the stage, its two admin endpoints and its bookkeeping columns
-- all go away.
--
-- 1. Everyone currently on the shortlist returns to Building profile (PENDING).
--    By construction those rows are incomplete profiles, which is exactly what
--    Building profile is (PENDING + completeProfile = false). A row that is
--    somehow SHORTLISTED *and* complete lands in Awaiting review instead, which
--    is also PENDING — the same status, so one statement covers both.
-- 2. `wasShortlisted` and `shortlistedById` only ever fed the shortlist branch
--    of the completion state machine and the admin "Shortlisted by" column,
--    both of which are gone.
-- 3. `SHORTLISTED` leaves the ApprovalStatus enum. Postgres cannot drop a value
--    from an enum in place, so the type is recreated without it. This must run
--    after step 1, or the cast below would fail on a surviving row.

UPDATE "CreatorApproval"
SET status = 'PENDING',
    "updatedAt" = NOW()
WHERE status = 'SHORTLISTED';

DROP INDEX IF EXISTS "CreatorApproval_shortlistedById_idx";

ALTER TABLE "CreatorApproval"
  DROP CONSTRAINT IF EXISTS "CreatorApproval_shortlistedById_fkey";

ALTER TABLE "CreatorApproval"
  DROP COLUMN IF EXISTS "shortlistedById",
  DROP COLUMN IF EXISTS "wasShortlisted";

ALTER TYPE "ApprovalStatus" RENAME TO "ApprovalStatus_old";

CREATE TYPE "ApprovalStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'SELF_COMPLETED',
  'WITHDRAWN'
);

ALTER TABLE "CreatorApproval"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "ApprovalStatus" USING ("status"::text::"ApprovalStatus"),
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP TYPE "ApprovalStatus_old";

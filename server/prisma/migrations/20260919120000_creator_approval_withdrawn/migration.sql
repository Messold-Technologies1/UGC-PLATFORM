-- New "Withdrawn" stage for the creator application flow.
--
-- When a creator pulls a submitted profile back for editing it previously
-- collapsed into Building (PENDING + incomplete), indistinguishable from a
-- brand-new profile. WITHDRAWN gives the withdraw its own tracked stage. On the
-- next Go Live the profile returns to SELF_COMPLETED (or Awaiting review for
-- shortlisted creators), exactly like a first-time submission.
--
-- `withdrawnAt` records when the most recent withdraw happened (kept after the
-- creator resubmits, as an audit trail).
--
-- Postgres cannot USE a new enum value in the transaction that adds it, but
-- adding a column that does not reference the value is fine, so both run here.
ALTER TYPE "ApprovalStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';

ALTER TABLE "CreatorApproval" ADD COLUMN IF NOT EXISTS "withdrawnAt" TIMESTAMP(3);

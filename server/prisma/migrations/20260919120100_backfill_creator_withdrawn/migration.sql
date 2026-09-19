-- Backfill existing withdrawn-for-editing profiles into the new WITHDRAWN stage.
--
-- Before this feature, withdrawing a submitted profile collapsed it back to
-- Building (status PENDING + completeProfile FALSE), indistinguishable from a
-- brand-new profile — EXCEPT it still carries goLivePoliciesAcceptedAt from its
-- earlier submission. That is exactly the condition the creator wizard uses to
-- show "you've reopened your profile for edit", so it precisely identifies the
-- profiles that should now live in the Withdrawn tab, without sweeping in fresh
-- Building profiles (which never accepted the Go-Live policies).
--
-- withdrawnAt is set from the approval row's current updatedAt — the withdraw
-- was the last thing to touch that row (it set PENDING and cleared the
-- send-for-review / rejection fields; draft saves never update it) — so it is
-- the best available proxy for when the creator withdrew. Postgres evaluates
-- every SET expression against the pre-UPDATE row, so reading "updatedAt" while
-- also overwriting it in the same statement yields the old value.
--
-- Deliberately untouched:
--   * PENDING + complete            -> Awaiting review (a real submission)
--   * PENDING + incomplete, no      -> still "Building profile" (never submitted)
--     goLivePoliciesAcceptedAt
--   * SHORTLISTED / APPROVED / REJECTED / SELF_COMPLETED -> unchanged
--
-- Idempotent: re-running matches nothing, since the rows are no longer PENDING.
UPDATE "CreatorApproval" AS ca
SET
  status = 'WITHDRAWN',
  "withdrawnAt" = COALESCE(ca."withdrawnAt", ca."updatedAt"),
  "updatedAt" = NOW()
FROM "CreatorProfile" AS cp
WHERE ca."creatorId" = cp."id"
  AND ca."status" = 'PENDING'
  AND cp."completeProfile" = FALSE
  AND cp."isListed" = FALSE
  AND cp."goLivePoliciesAcceptedAt" IS NOT NULL;

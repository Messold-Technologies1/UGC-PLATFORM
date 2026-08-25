-- Backfill existing creators into the new "Self complete" stage.
--
-- Rule (profile_first onboarding): a creator whose profile is COMPLETE and whose
-- approval is still PENDING has not actually been vetted by an admin — they
-- either self-completed, or were shortlisted and auto-promoted. Under the new
-- flow they belong in Self complete until an admin sends them for review.
--
-- Deliberately untouched:
--   * SHORTLISTED  -> stays shortlisted (still building; auto-promotes on completion)
--   * APPROVED     -> already vetted; listed if complete
--   * REJECTED     -> keeps its rejection
--   * PENDING + incomplete -> still "Building profile"
--
-- Idempotent: re-running matches nothing, since the rows are no longer PENDING.
UPDATE "CreatorApproval" AS ca
SET
  status = 'SELF_COMPLETED',
  "updatedAt" = NOW()
FROM "CreatorProfile" AS cp
WHERE ca."creatorId" = cp."id"
  AND ca."status" = 'PENDING'
  AND cp."completeProfile" = TRUE;

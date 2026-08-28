-- Shortlisted creators who finish their profile belong in Awaiting review
-- (PENDING), not Self complete. Two things put them in the wrong place:
--
-- 1. Backfills latched completeProfile without flipping SHORTLISTED → PENDING,
--    so a finished shortlisted profile sat in neither tab (shortlist requires
--    incomplete; self-complete requires SELF_COMPLETED).
-- 2. 20260825120100 moved every complete+PENDING row into SELF_COMPLETED,
--    including people an admin had already shortlisted (auto-promoted to
--    PENDING). Those still carry approvedById from the shortlist action.

-- Finished but still tagged SHORTLISTED → Awaiting review
UPDATE "CreatorApproval" AS ca
SET
  status = 'PENDING',
  "updatedAt" = NOW()
FROM "CreatorProfile" AS cp
WHERE ca."creatorId" = cp."id"
  AND ca."status" = 'SHORTLISTED'
  AND cp."completeProfile" = TRUE;

-- Self-complete rows an admin had already picked (shortlisted) → Awaiting review
UPDATE "CreatorApproval" AS ca
SET
  status = 'PENDING',
  "updatedAt" = NOW()
FROM "CreatorProfile" AS cp
WHERE ca."creatorId" = cp."id"
  AND ca."status" = 'SELF_COMPLETED'
  AND cp."completeProfile" = TRUE
  AND ca."approvedById" IS NOT NULL;

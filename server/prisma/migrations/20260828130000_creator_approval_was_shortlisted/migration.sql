-- Durable "this creator was picked from Building profile" flag, plus a second
-- pass of the Awaiting-review repair (idempotent with 20260828120000).
--
-- Flow:
--   Building → Shortlisted → (complete) Awaiting review → Listed
--   Building → (complete, never shortlisted) Self complete → Awaiting review → Listed

ALTER TABLE "CreatorApproval"
  ADD COLUMN IF NOT EXISTS "wasShortlisted" BOOLEAN NOT NULL DEFAULT false;

-- Anyone currently on the shortlist
UPDATE "CreatorApproval"
SET "wasShortlisted" = true
WHERE status = 'SHORTLISTED';

-- Finished but still tagged SHORTLISTED → Awaiting review
UPDATE "CreatorApproval" AS ca
SET
  status = 'PENDING',
  "wasShortlisted" = true,
  "updatedAt" = NOW()
FROM "CreatorProfile" AS cp
WHERE ca."creatorId" = cp."id"
  AND ca."status" = 'SHORTLISTED'
  AND cp."completeProfile" = TRUE;

-- Awaiting-review rows that already completed after an admin pick
UPDATE "CreatorApproval" AS ca
SET
  "wasShortlisted" = true,
  "updatedAt" = NOW()
FROM "CreatorProfile" AS cp
WHERE ca."creatorId" = cp."id"
  AND ca."status" = 'PENDING'
  AND cp."completeProfile" = TRUE
  AND ca."approvedById" IS NOT NULL
  AND ca."wasShortlisted" = false;

-- Self-complete rows an admin had already shortlisted → Awaiting review
UPDATE "CreatorApproval" AS ca
SET
  status = 'PENDING',
  "wasShortlisted" = true,
  "updatedAt" = NOW()
FROM "CreatorProfile" AS cp
WHERE ca."creatorId" = cp."id"
  AND ca."status" = 'SELF_COMPLETED'
  AND cp."completeProfile" = TRUE
  AND ca."approvedById" IS NOT NULL;

-- Track who removed a brand user, and replace the revocation columns that never
-- shipped.
--
-- Removing a brand user hard-deletes the User row and cascades its brand data,
-- so a "deletedBy"/"deletedAt" column on User could never survive the operation
-- it was meant to record. The audit lives in its own table with no foreign keys
-- for exactly that reason.
CREATE TABLE "BrandUserRemoval" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "removedUserId"    UUID         NOT NULL,
  "removedUserEmail" TEXT         NOT NULL,
  "removedUserName"  TEXT,
  "brandProfileId"   UUID         NOT NULL,
  "brandName"        TEXT,
  "removedById"      UUID         NOT NULL,
  "removedByEmail"   TEXT,
  "reason"           TEXT,
  "removedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BrandUserRemoval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrandUserRemoval_removedAt_idx" ON "BrandUserRemoval"("removedAt");
CREATE INDEX "BrandUserRemoval_removedUserEmail_idx" ON "BrandUserRemoval"("removedUserEmail");
CREATE INDEX "BrandUserRemoval_removedById_idx" ON "BrandUserRemoval"("removedById");

-- The brand-access revocation columns added in 20260409120000 were never written
-- by application code: `brandAccessRevokedAt` was only ever read (a guard check,
-- the /me payload and a listBrands filter) and the `ById`/`Reason` pair was not
-- referenced at all. Soft revocation was superseded by the hard-delete removal
-- flow, so the feature is being removed rather than left half-wired.
DROP INDEX IF EXISTS "User_brandAccessRevokedAt_idx";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "brandAccessRevokedAt",
  DROP COLUMN IF EXISTS "brandAccessRevokedById",
  DROP COLUMN IF EXISTS "brandAccessRevocationReason";

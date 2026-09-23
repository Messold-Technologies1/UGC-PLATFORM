-- Drop the brand-access revocation columns added in 20260409120000.
--
-- They were never written by application code. `brandAccessRevokedById` and
-- `brandAccessRevocationReason` were referenced nowhere at all, and
-- `brandAccessRevokedAt` was only ever read — a guard branch, the /me payload
-- and a listBrands filter — so the flag it backed has been permanently false.
--
-- Soft revocation was superseded first by hard deletion and now by
-- User.status (ACTIVE / DEACTIVATED), which every access path already enforces,
-- so these are redundant rather than unfinished.
DROP INDEX IF EXISTS "User_brandAccessRevokedAt_idx";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "brandAccessRevokedAt",
  DROP COLUMN IF EXISTS "brandAccessRevokedById",
  DROP COLUMN IF EXISTS "brandAccessRevocationReason";

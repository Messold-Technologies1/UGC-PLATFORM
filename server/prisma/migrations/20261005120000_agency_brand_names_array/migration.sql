-- Agency brand names as string array; drop agency ↔ BrandProfile linkage.
-- Briefs may belong to an agency without a BrandProfile.

ALTER TABLE "Agency" ADD COLUMN "brandNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Brief" ADD COLUMN "agencyId" UUID;
ALTER TABLE "Brief" ALTER COLUMN "brandId" DROP NOT NULL;

ALTER TABLE "Brief" ADD CONSTRAINT "Brief_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Brief_agencyId_createdAt_idx" ON "Brief"("agencyId", "createdAt");

-- Drop agency active brand and brand profile agency FK
ALTER TABLE "Agency" DROP CONSTRAINT IF EXISTS "Agency_lastActiveBrandProfileId_fkey";
ALTER TABLE "Agency" DROP CONSTRAINT IF EXISTS "Agency_lastActiveBrandProfileId_key";
ALTER TABLE "Agency" DROP COLUMN IF EXISTS "lastActiveBrandProfileId";

ALTER TABLE "BrandProfile" DROP CONSTRAINT IF EXISTS "BrandProfile_agencyId_fkey";
DROP INDEX IF EXISTS "BrandProfile_agencyId_idx";
ALTER TABLE "BrandProfile" DROP COLUMN IF EXISTS "agencyId";

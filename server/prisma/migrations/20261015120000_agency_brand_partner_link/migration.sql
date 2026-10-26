-- Agency <-> Brand partner links.
--
-- An agency hands its partner code to a brand; the brand redeems it to create a
-- PENDING link; the agency accepts, making it ACTIVE. Only ACTIVE grants the
-- agency access to operate inside that brand's workspace.
--
-- The brandId-XOR-agencyId ownership invariant is deliberately NOT touched.
-- Orders an agency places for a linked brand are ordinary brand-owned orders
-- (brandId set, agencyId NULL); the new placedByAgencyId columns are pure
-- attribution. Every existing owner query therefore keeps working, and legacy
-- agency-direct rows are untouched.
--
-- Entirely additive: new nullable columns and a new table. Safe to run with
-- AGENCY_BRAND_PARTNER_LINKS_ENABLED=false.

-- CreateEnum
CREATE TYPE "AgencyBrandLinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'REVOKED');

-- AlterTable: the agency's shareable partner code.
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "partnerId" TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "partnerIdIssuedAt" TIMESTAMP(3);
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "partnerIdRotatedAt" TIMESTAMP(3);

-- Backfill a code for every existing agency.
--
-- Crockford base32 (no I/L/O/U, so the code survives being read over a phone
-- call). Re-draws on the astronomically unlikely collision rather than failing
-- the migration. Runs before the unique index so the collision check is a plain
-- lookup; the index is created immediately after.
DO $$
DECLARE
  rec       RECORD;
  candidate TEXT;
  alphabet  CONSTANT TEXT := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
BEGIN
  FOR rec IN SELECT "id" FROM "Agency" WHERE "partnerId" IS NULL LOOP
    LOOP
      candidate :=
        'GC-' ||
        (SELECT string_agg(substr(alphabet, (floor(random() * 32)::int) + 1, 1), '')
           FROM generate_series(1, 4)) ||
        '-' ||
        (SELECT string_agg(substr(alphabet, (floor(random() * 32)::int) + 1, 1), '')
           FROM generate_series(1, 4));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "Agency" WHERE "partnerId" = candidate);
    END LOOP;

    UPDATE "Agency"
       SET "partnerId" = candidate,
           "partnerIdIssuedAt" = NOW()
     WHERE "id" = rec."id";
  END LOOP;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Agency_partnerId_key" ON "Agency"("partnerId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "AgencyBrandLink" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "status" "AgencyBrandLinkStatus" NOT NULL DEFAULT 'PENDING',
    "partnerIdUsed" TEXT NOT NULL,
    "requestedByUserId" UUID NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedByUserId" UUID,
    "respondedAt" TIMESTAMP(3),
    "revokedByUserId" UUID,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyBrandLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AgencyBrandLink_agencyId_brandId_key"
  ON "AgencyBrandLink"("agencyId", "brandId");
CREATE INDEX IF NOT EXISTS "AgencyBrandLink_brandId_status_idx"
  ON "AgencyBrandLink"("brandId", "status");
CREATE INDEX IF NOT EXISTS "AgencyBrandLink_agencyId_status_idx"
  ON "AgencyBrandLink"("agencyId", "status");

-- AddForeignKey
ALTER TABLE "AgencyBrandLink"
  ADD CONSTRAINT "AgencyBrandLink_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "Agency"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgencyBrandLink"
  ADD CONSTRAINT "AgencyBrandLink_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "BrandProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: attribution columns.
--
-- ON DELETE SET NULL, not CASCADE: deleting an agency must never delete a
-- brand's orders, briefs, wishlists or reviews. The brand owns them; the agency
-- merely acted.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "placedByAgencyId" UUID;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "placedByUserId" UUID;

ALTER TABLE "OrderCheckoutBatch" ADD COLUMN IF NOT EXISTS "placedByAgencyId" UUID;
ALTER TABLE "OrderCheckoutBatch" ADD COLUMN IF NOT EXISTS "placedByUserId" UUID;

ALTER TABLE "Brief" ADD COLUMN IF NOT EXISTS "placedByAgencyId" UUID;
ALTER TABLE "Brief" ADD COLUMN IF NOT EXISTS "placedByUserId" UUID;

ALTER TABLE "BrandWishlist" ADD COLUMN IF NOT EXISTS "createdByAgencyId" UUID;
ALTER TABLE "BrandWishlist" ADD COLUMN IF NOT EXISTS "createdByUserId" UUID;

ALTER TABLE "CreatorRatingReview" ADD COLUMN IF NOT EXISTS "placedByAgencyId" UUID;
ALTER TABLE "CreatorRatingReview" ADD COLUMN IF NOT EXISTS "placedByUserId" UUID;

-- AddForeignKey
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_placedByAgencyId_fkey"
  FOREIGN KEY ("placedByAgencyId") REFERENCES "Agency"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderCheckoutBatch"
  ADD CONSTRAINT "OrderCheckoutBatch_placedByAgencyId_fkey"
  FOREIGN KEY ("placedByAgencyId") REFERENCES "Agency"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Brief"
  ADD CONSTRAINT "Brief_placedByAgencyId_fkey"
  FOREIGN KEY ("placedByAgencyId") REFERENCES "Agency"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BrandWishlist"
  ADD CONSTRAINT "BrandWishlist_createdByAgencyId_fkey"
  FOREIGN KEY ("createdByAgencyId") REFERENCES "Agency"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CreatorRatingReview"
  ADD CONSTRAINT "CreatorRatingReview_placedByAgencyId_fkey"
  FOREIGN KEY ("placedByAgencyId") REFERENCES "Agency"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: drives the agency's "spent on behalf" report and the
-- "placed by Agency X" lookups.
CREATE INDEX IF NOT EXISTS "Order_placedByAgencyId_createdAt_idx"
  ON "Order"("placedByAgencyId", "createdAt");
CREATE INDEX IF NOT EXISTS "OrderCheckoutBatch_placedByAgencyId_createdAt_idx"
  ON "OrderCheckoutBatch"("placedByAgencyId", "createdAt");
CREATE INDEX IF NOT EXISTS "Brief_placedByAgencyId_createdAt_idx"
  ON "Brief"("placedByAgencyId", "createdAt");
CREATE INDEX IF NOT EXISTS "CreatorRatingReview_placedByAgencyId_createdAt_idx"
  ON "CreatorRatingReview"("placedByAgencyId", "createdAt");

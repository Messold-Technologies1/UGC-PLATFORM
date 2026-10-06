-- Agency-owned orders: no internal BrandProfile.
-- Order / OrderCheckoutBatch may belong to a brand OR an agency.

-- Undo prior orderBrandProfile linkage if present.
ALTER TABLE "Agency" DROP CONSTRAINT IF EXISTS "Agency_orderBrandProfileId_fkey";
DROP INDEX IF EXISTS "Agency_orderBrandProfileId_key";

-- Drop orphaned order brand profiles that were only linked from Agency.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Agency' AND column_name = 'orderBrandProfileId'
  ) THEN
    DELETE FROM "BrandProfile" bp
    WHERE bp.id IN (
      SELECT a."orderBrandProfileId"
      FROM "Agency" a
      WHERE a."orderBrandProfileId" IS NOT NULL
    )
    AND bp."userId" IS NULL
    AND NOT EXISTS (SELECT 1 FROM "Order" o WHERE o."brandId" = bp.id)
    AND NOT EXISTS (SELECT 1 FROM "Brief" b WHERE b."brandId" = bp.id)
    AND NOT EXISTS (SELECT 1 FROM "BrandWallet" w WHERE w."brandId" = bp.id)
    AND NOT EXISTS (SELECT 1 FROM "BrandWishlist" wl WHERE wl."brandId" = bp.id);

    ALTER TABLE "Agency" DROP COLUMN "orderBrandProfileId";
  END IF;
END $$;

ALTER TABLE "Order" ALTER COLUMN "brandId" DROP NOT NULL;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "agencyId" UUID;

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_agencyId_fkey";
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "Agency"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Order_agencyId_createdAt_idx" ON "Order"("agencyId", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_agencyId_lastChatActivityAt_idx" ON "Order"("agencyId", "lastChatActivityAt" DESC);
CREATE INDEX IF NOT EXISTS "Order_agencyId_creatorId_status_idx" ON "Order"("agencyId", "creatorId", "status");

ALTER TABLE "OrderCheckoutBatch" ALTER COLUMN "brandId" DROP NOT NULL;
ALTER TABLE "OrderCheckoutBatch" ADD COLUMN IF NOT EXISTS "agencyId" UUID;

ALTER TABLE "OrderCheckoutBatch" DROP CONSTRAINT IF EXISTS "OrderCheckoutBatch_agencyId_fkey";
ALTER TABLE "OrderCheckoutBatch"
  ADD CONSTRAINT "OrderCheckoutBatch_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "Agency"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "OrderCheckoutBatch_agencyId_createdAt_idx"
  ON "OrderCheckoutBatch"("agencyId", "createdAt");

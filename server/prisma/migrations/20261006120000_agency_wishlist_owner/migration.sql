-- BrandWishlist: brand XOR agency ownership (agencies can own wishlists).

ALTER TABLE "BrandWishlist" ALTER COLUMN "brandId" DROP NOT NULL;
ALTER TABLE "BrandWishlist" ADD COLUMN IF NOT EXISTS "agencyId" UUID;

ALTER TABLE "BrandWishlist" DROP CONSTRAINT IF EXISTS "BrandWishlist_brandId_fkey";
ALTER TABLE "BrandWishlist"
  ADD CONSTRAINT "BrandWishlist_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "BrandProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BrandWishlist" DROP CONSTRAINT IF EXISTS "BrandWishlist_agencyId_fkey";
ALTER TABLE "BrandWishlist"
  ADD CONSTRAINT "BrandWishlist_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "Agency"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "BrandWishlist_brandId_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "BrandWishlist_brandId_name_key"
  ON "BrandWishlist"("brandId", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "BrandWishlist_agencyId_name_key"
  ON "BrandWishlist"("agencyId", "name");

CREATE INDEX IF NOT EXISTS "BrandWishlist_agencyId_createdAt_idx"
  ON "BrandWishlist"("agencyId", "createdAt");

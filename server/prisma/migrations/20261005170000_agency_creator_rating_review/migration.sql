-- CreatorRatingReview: brandId optional + agencyId (agency can rate creators)

ALTER TABLE "CreatorRatingReview" ALTER COLUMN "brandId" DROP NOT NULL;
ALTER TABLE "CreatorRatingReview" ADD COLUMN IF NOT EXISTS "agencyId" UUID;

ALTER TABLE "CreatorRatingReview" DROP CONSTRAINT IF EXISTS "CreatorRatingReview_brandId_fkey";
ALTER TABLE "CreatorRatingReview"
  ADD CONSTRAINT "CreatorRatingReview_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "BrandProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorRatingReview" DROP CONSTRAINT IF EXISTS "CreatorRatingReview_agencyId_fkey";
ALTER TABLE "CreatorRatingReview"
  ADD CONSTRAINT "CreatorRatingReview_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "Agency"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "CreatorRatingReview_agencyId_createdAt_idx"
  ON "CreatorRatingReview"("agencyId", "createdAt");

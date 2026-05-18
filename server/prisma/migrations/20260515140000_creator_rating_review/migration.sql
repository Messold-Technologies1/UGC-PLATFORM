-- Creator rating/review per order + review count on stats

ALTER TABLE "CreatorStats" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "CreatorRatingReview" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "brandId" UUID NOT NULL,
  "creatorId" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "review" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CreatorRatingReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatorRatingReview_orderId_key" ON "CreatorRatingReview"("orderId");
CREATE INDEX "CreatorRatingReview_creatorId_createdAt_idx" ON "CreatorRatingReview"("creatorId", "createdAt");
CREATE INDEX "CreatorRatingReview_brandId_createdAt_idx" ON "CreatorRatingReview"("brandId", "createdAt");

ALTER TABLE "CreatorRatingReview"
ADD CONSTRAINT "CreatorRatingReview_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorRatingReview"
ADD CONSTRAINT "CreatorRatingReview_brandId_fkey"
FOREIGN KEY ("brandId") REFERENCES "BrandProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorRatingReview"
ADD CONSTRAINT "CreatorRatingReview_creatorId_fkey"
FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorRatingReview"
ADD CONSTRAINT "CreatorRatingReview_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5);

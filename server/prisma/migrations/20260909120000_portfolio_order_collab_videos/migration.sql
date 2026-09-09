-- Auto-publish a completed order's approved final video into the creator's
-- portfolio as a "Brand Collab" tile.
--
-- The tile holds an independent COPY of the video under the portfolio prefix, so
-- the order and the portfolio never share an S3 object. `sourceOrderId` resolves
-- the brand for the badge and is the idempotency key (one collab tile per
-- order); `sourceDeliveryId` records the exact delivery/revision the copy came
-- from. Both foreign keys are ON DELETE SET NULL, so removing the order leaves
-- the portfolio tile and its object intact.
--
-- The new value is not used in SQL here (only added as a column/index/FK), so it
-- is safe to add it in the same transaction as the rest.

-- AlterEnum
ALTER TYPE "PortfolioVideoSource" ADD VALUE IF NOT EXISTS 'ORDER';

-- AlterTable
ALTER TABLE "CreatorPortfolioVideo"
  ADD COLUMN "sourceOrderId" UUID,
  ADD COLUMN "sourceDeliveryId" UUID;

-- CreateIndex
-- One collab tile per order. NULLs do not collide, so upload/Instagram rows are
-- unaffected and the accept hook + backfill stay idempotent under retries.
CREATE UNIQUE INDEX "CreatorPortfolioVideo_creatorId_sourceOrderId_key"
  ON "CreatorPortfolioVideo"("creatorId", "sourceOrderId");

-- AddForeignKey
ALTER TABLE "CreatorPortfolioVideo"
  ADD CONSTRAINT "CreatorPortfolioVideo_sourceOrderId_fkey"
  FOREIGN KEY ("sourceOrderId") REFERENCES "Order"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Let a buyer fix the brief until the creator accepts it.
--
-- A brand submits the brief, spots a wrong product URL or a missing CTA, and
-- today has no way back: the only exits from BRIEF_SUBMITTED are the creator
-- accepting a brief nobody wants or the order being cancelled outright. The
-- buyer can now edit and resubmit while the order sits in BRIEF_SUBMITTED.
--
-- The obstacle is that a Brief is a reusable template: `attach-to-orders`
-- puts one row on many orders at once, and the creator reads it live through
-- `Order.briefId`. Editing that row in place would silently rewrite the brief
-- under every other creator already working from it — including ones who have
-- already accepted. So editing from an order forks: the order gets a private
-- copy (`orderScopedOrderId`), the library brief is left alone, and
-- `Order.briefId` is repointed at the copy.
--
-- `briefRevisedAt` is what both sides' "Brief updated" badge reads.
-- `briefSubmittedAt` is reset to the same moment, so the creator's unanswered
-- -brief reminder starts over rather than nudging on the original submission.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "briefRevisedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Brief" ADD COLUMN "orderScopedOrderId" UUID,
                    ADD COLUMN "forkedFromBriefId"  UUID;

-- CreateIndex
CREATE INDEX "Brief_orderScopedOrderId_idx" ON "Brief"("orderScopedOrderId");

-- No backfill. Every brief that exists today is a library brief, which is
-- exactly what NULL means here, and no order has been revised yet.

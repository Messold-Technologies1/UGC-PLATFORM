-- Auto-accept an order whose brand never reviews the delivered content.
--
-- A creator delivers, the brand goes quiet, and the order sits in DELIVERED
-- forever: the creator is never paid and the content never reaches their
-- portfolio. `autoAcceptAt` is the deadline after which the order accepts
-- itself, set to max(deliveryDueAt, deliveredAt) + 5 days so that delivering
-- early never shortens the brand's review window and delivering late never
-- shortens it either. NULL means no clock is running, which is the state while
-- the ball is in someone else's court (revision requested, dispute open) and
-- after the order is accepted.
--
-- `acceptedBy` records how the order closed. Support needs to tell a brand that
-- reviewed the work from one that simply never looked, because a brand may
-- still open a dispute after an auto-accept.

-- CreateEnum
CREATE TYPE "OrderAcceptedBy" AS ENUM ('BRAND', 'AUTO');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "autoAcceptAt" TIMESTAMP(3),
                    ADD COLUMN "acceptedBy" "OrderAcceptedBy";

-- CreateIndex
CREATE INDEX "Order_autoAcceptAt_idx" ON "Order"("autoAcceptAt");

-- Every acceptance that exists today was a brand clicking Accept: there has
-- never been another path to acceptedAt. Backfilled so the column can be read
-- as the whole truth rather than "the truth since this deploy".
UPDATE "Order"
SET "acceptedBy" = 'BRAND'
WHERE "acceptedAt" IS NOT NULL;

-- Give the existing backlog a full window rather than accepting it on the first
-- sweep. These orders were delivered under the old rules, where sitting in
-- DELIVERED had no deadline at all; closing months of them in one tick would
-- fire a burst of completion emails, store credit and portfolio publishes that
-- no brand was warned about. Five days from this migration means every one of
-- them gets the same window a new delivery gets, and the backlog still clears
-- within the week.
--
-- Orders under an open dispute are left alone: a dispute is exactly the case
-- where the brand HAS engaged and acceptance must stay a human decision.
UPDATE "Order" o
SET "autoAcceptAt" = NOW() + INTERVAL '5 days'
WHERE o."status" IN ('DELIVERED', 'REVISION_SUBMITTED')
  AND o."acceptedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "OrderDispute" d
    WHERE d."orderId" = o."id" AND d."status" = 'OPEN'
  );

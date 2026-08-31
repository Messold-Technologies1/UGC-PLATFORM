-- AlterTable: record why an order was rejected by the creator or cancelled by
-- the brand (both set status = REJECTED). Additive and nullable — safe backfill.
ALTER TABLE "Order" ADD COLUMN "cancellationReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "cancelledBy" TEXT;

-- Split promised delivery due date from grace-period end date.
ALTER TABLE "Order" ADD COLUMN "deliveryDueAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "deliveryGraceDeadlineAt" TIMESTAMP(3);

-- Previous deliveryDeadlineAt included a 2-day grace period.
UPDATE "Order"
SET
  "deliveryGraceDeadlineAt" = "deliveryDeadlineAt",
  "deliveryDueAt" = "deliveryDeadlineAt" - INTERVAL '2 days'
WHERE "deliveryDeadlineAt" IS NOT NULL;

DROP INDEX IF EXISTS "Order_deliveryDeadlineAt_idx";
ALTER TABLE "Order" DROP COLUMN "deliveryDeadlineAt";

CREATE INDEX "Order_deliveryGraceDeadlineAt_idx" ON "Order"("deliveryGraceDeadlineAt");

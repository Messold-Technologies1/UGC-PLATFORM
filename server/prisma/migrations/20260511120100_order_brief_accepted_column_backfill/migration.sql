-- AlterTable (runs in a new transaction after BRIEF_ACCEPTED exists)
ALTER TABLE "Order" ADD COLUMN "briefAcceptedAt" TIMESTAMP(3);

-- Backfill: existing in-flight orders were able to deliver from BRIEF_SUBMITTED; treat as accepted.
UPDATE "Order"
SET
  status = 'BRIEF_ACCEPTED'::"OrderStatus",
  "briefAcceptedAt" = COALESCE("briefSubmittedAt", "createdAt")
WHERE status = 'BRIEF_SUBMITTED'::"OrderStatus";

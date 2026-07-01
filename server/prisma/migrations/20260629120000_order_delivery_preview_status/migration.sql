-- Watermark preview pipeline status for OrderDelivery.
-- Existing rows default to "ready" so historical deliveries are never reprocessed;
-- new deliveries are explicitly created as "pending".
ALTER TABLE "OrderDelivery"
  ADD COLUMN "previewStatus" TEXT NOT NULL DEFAULT 'ready';

CREATE INDEX "OrderDelivery_previewStatus_createdAt_idx"
  ON "OrderDelivery" ("previewStatus", "createdAt");

-- Watermark reconcile hardening.
--
-- previewAttempts: retry budget so a poison delivery is not re-driven forever.
--   Once it exhausts the budget the row is moved to the terminal "dead" state
--   and the safety-net poller stops picking it up.
--
-- previewUpdatedAt: bumped on every previewStatus change. Lets the safety net
--   reclaim a delivery stuck in the short-lived "processing" claim after a crash
--   (processing rows older than the stale threshold are treated as reclaimable).
ALTER TABLE "OrderDelivery"
  ADD COLUMN "previewAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "previewUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Supports the stale-"processing" reclaim scan without a full table scan.
CREATE INDEX "OrderDelivery_previewStatus_previewUpdatedAt_idx"
  ON "OrderDelivery" ("previewStatus", "previewUpdatedAt");

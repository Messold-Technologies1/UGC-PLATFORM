-- Cross-instance claim + retry budget for the Instagram mirror.
--
-- The mirror de-duplicated concurrent runs with an in-memory Set, which only
-- guards a single process: the BullMQ worker replica and an API replica running
-- its inline/watchdog fallback could both stream the same reel to the same S3
-- key. Worse, nothing recovered a row whose process died mid-mirror — it sat in
-- PROCESSING forever, showing a permanent "still being saved" badge.
--
-- This is the pattern OrderDelivery already uses for watermark previews
-- (previewAttempts / previewUpdatedAt + a conditional UPDATE as the lock, plus a
-- DB-truth reconcile scan). Same shape here.

ALTER TABLE "CreatorPortfolioVideo"
  ADD COLUMN "mirrorAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "mirrorClaimedAt" TIMESTAMP(3);

-- Rows already parked in PROCESSING have no claim timestamp, so the reconcile
-- scan would treat them as freshly claimed and never touch them. Backdate them
-- to now so the first scan after deploy picks them up rather than leaving them
-- stuck for good.
UPDATE "CreatorPortfolioVideo"
   SET "mirrorClaimedAt" = now()
 WHERE "assetState" = 'PROCESSING';

CREATE INDEX "CreatorPortfolioVideo_assetState_mirrorClaimedAt_idx"
  ON "CreatorPortfolioVideo"("assetState", "mirrorClaimedAt");

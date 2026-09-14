-- Media normalization for creator videos.
--
-- Portfolio and intro videos are served exactly as uploaded, so a raw HEVC/.mov
-- (typical iPhone recording) renders black-with-audio in browsers that can't
-- decode HEVC. These columns track transcoding each video to a web-safe
-- H.264/AAC MP4 (downscaled + faststart, audio kept), done off-request and
-- swapped in place. Status mirrors the preview/watermark state machine.

ALTER TABLE "CreatorProfile"
  ADD COLUMN "introVideoNormalizeStatus" TEXT,
  ADD COLUMN "introVideoNormalizeAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "introVideoNormalizeUpdatedAt" TIMESTAMP(3);

ALTER TABLE "CreatorPortfolioVideo"
  ADD COLUMN "videoNormalizeStatus" TEXT,
  ADD COLUMN "videoNormalizeAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "videoNormalizeUpdatedAt" TIMESTAMP(3);

-- Reconcile/backfill scans.
CREATE INDEX "CreatorProfile_introVideoNormalizeStatus_idx"
  ON "CreatorProfile" ("introVideoNormalizeStatus");
CREATE INDEX "CreatorPortfolioVideo_videoNormalizeStatus_idx"
  ON "CreatorPortfolioVideo" ("videoNormalizeStatus");

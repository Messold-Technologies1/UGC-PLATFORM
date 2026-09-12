-- Card preview renditions for creator discovery cards.
--
-- Hover-to-play on the browse grid previously streamed the raw intro / first
-- portfolio video — a multi-MB phone upload, often without a leading moov atom,
-- so the browser stalled before the first frame. These columns hold a
-- faststart + downscaled rendition generated off-request (see PreviewVideoService
-- / PreviewVideoQueueService). `previewVideoSourceKey` records which original S3
-- key the rendition was built from, so the pipeline regenerates when the
-- effective source changes and no-ops when it hasn't. Status mirrors the
-- watermark pipeline's state machine.
ALTER TABLE "CreatorProfile"
  ADD COLUMN "previewVideoKey" TEXT,
  ADD COLUMN "previewVideoUrl" TEXT,
  ADD COLUMN "previewVideoSourceKey" TEXT,
  ADD COLUMN "previewVideoStatus" TEXT,
  ADD COLUMN "previewVideoAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "previewVideoUpdatedAt" TIMESTAMP(3);

-- Serves the preview-video reconcile backstop: cheap lookup of listed creators
-- whose card preview is still owed (pending/failed/null/stale).
CREATE INDEX "CreatorProfile_isListed_previewVideoStatus_idx"
  ON "CreatorProfile" ("isListed", "previewVideoStatus");

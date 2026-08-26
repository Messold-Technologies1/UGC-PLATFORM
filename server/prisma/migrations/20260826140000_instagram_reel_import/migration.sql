-- Instagram reel import: provenance on portfolio videos, plus the reel cache
-- that keeps the gallery off the Graph API request path.
--
-- Additive. No data is dropped and no column is narrowed, so this is safe to
-- deploy ahead of the application code.

-- 1. Where a portfolio video came from, and whether its bytes are in S3 yet.
CREATE TYPE "PortfolioVideoSource" AS ENUM ('UPLOAD', 'INSTAGRAM');
CREATE TYPE "PortfolioVideoAssetState" AS ENUM ('READY', 'PROCESSING', 'FAILED', 'LINK_ONLY');
CREATE TYPE "IgMediaSyncStatus" AS ENUM ('IDLE', 'QUEUED', 'SYNCING', 'READY', 'ERROR');

ALTER TABLE "CreatorPortfolioVideo"
  ADD COLUMN "source"      "PortfolioVideoSource"     NOT NULL DEFAULT 'UPLOAD',
  ADD COLUMN "assetState"  "PortfolioVideoAssetState" NOT NULL DEFAULT 'READY',
  ADD COLUMN "igMediaId"   TEXT,
  ADD COLUMN "igPermalink" TEXT,
  ADD COLUMN "igPostedAt"  TIMESTAMP(3),
  ADD COLUMN "importedAt"  TIMESTAMP(3);

-- Every existing row is an upload whose bytes are already in S3, which is what
-- the defaults above give them. No backfill statement is needed.

-- 2. An Instagram row exists before its mirror finishes, and a LINK_ONLY row
--    never gets a key at all, so these two stop being required. Widening a
--    NOT NULL column is safe for existing rows and for older app code, which
--    only ever reads values it already wrote.
ALTER TABLE "CreatorPortfolioVideo"
  ALTER COLUMN "videoKey" DROP NOT NULL,
  ALTER COLUMN "videoUrl" DROP NOT NULL;

-- NULLs are distinct in a Postgres unique index, so every upload row (igMediaId
-- NULL) coexists here. Only two imports of the same reel by one creator collide
-- — two different creators may legitimately import the same public reel.
CREATE UNIQUE INDEX "CreatorPortfolioVideo_creatorId_igMediaId_key"
  ON "CreatorPortfolioVideo"("creatorId", "igMediaId");

CREATE INDEX "CreatorPortfolioVideo_assetState_idx"
  ON "CreatorPortfolioVideo"("assetState");

-- 3. The reel cache. Rows are owned by a SocialConnection, so disconnecting
--    Instagram cascades them away while the imported portfolio videos survive.
CREATE TABLE "InstagramMediaItem" (
    "id" UUID NOT NULL,
    "connectionId" UUID NOT NULL,
    "igMediaId" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "mediaProductType" TEXT,
    "permalink" TEXT,
    "caption" TEXT,
    "mediaUrl" TEXT,
    "thumbnailUrl" TEXT,
    "urlsExpireAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "likeCount" INTEGER,
    "commentsCount" INTEGER,
    "viewCount" INTEGER,
    "importedVideoId" UUID,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InstagramMediaItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InstagramMediaItem_connectionId_igMediaId_key"
  ON "InstagramMediaItem"("connectionId", "igMediaId");

-- Serves the gallery's keyset pagination: newest reel first, igMediaId breaking
-- ties so the cursor is total.
CREATE INDEX "InstagramMediaItem_connectionId_mediaProductType_postedAt_igMediaId_idx"
  ON "InstagramMediaItem"("connectionId", "mediaProductType", "postedAt" DESC, "igMediaId" DESC);

CREATE INDEX "InstagramMediaItem_importedVideoId_idx"
  ON "InstagramMediaItem"("importedVideoId");

ALTER TABLE "InstagramMediaItem"
  ADD CONSTRAINT "InstagramMediaItem_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "SocialConnection"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. One sync-state row per connection: how far the page walk got, and how
--    fresh the cache is.
CREATE TABLE "InstagramMediaSyncState" (
    "connectionId" UUID NOT NULL,
    "status" "IgMediaSyncStatus" NOT NULL DEFAULT 'IDLE',
    "nextCursor" TEXT,
    "hasMore" BOOLEAN NOT NULL DEFAULT true,
    "pagesFetched" INTEGER NOT NULL DEFAULT 0,
    "reelCount" INTEGER NOT NULL DEFAULT 0,
    "lastFullSyncAt" TIMESTAMP(3),
    "lastRefreshAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InstagramMediaSyncState_pkey" PRIMARY KEY ("connectionId")
);

CREATE INDEX "InstagramMediaSyncState_status_idx"
  ON "InstagramMediaSyncState"("status");

CREATE INDEX "InstagramMediaSyncState_lastFullSyncAt_idx"
  ON "InstagramMediaSyncState"("lastFullSyncAt");

ALTER TABLE "InstagramMediaSyncState"
  ADD CONSTRAINT "InstagramMediaSyncState_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "SocialConnection"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

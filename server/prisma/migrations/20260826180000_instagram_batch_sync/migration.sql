-- Batched reel sync + a self-clearing "already imported" pointer.
--
-- Two independent fixes that share a migration because both touch the reel
-- cache:
--
--  1. `InstagramMediaSyncState.lastFullSyncAt` becomes `lastSyncedAt`. It used
--     to be stamped only when the page walk reached the end of the account,
--     which meant a creator with more reels than one sync budget could fetch
--     never got a timestamp at all: the cache read as permanently stale, the
--     gallery reported `syncing` on every open, and every open re-enqueued a
--     Graph walk. Freshness and completeness are now separate — `hasMore`
--     carries completeness, this column carries freshness.
--
--  2. `InstagramMediaItem.importedVideoId` becomes a real foreign key with
--     ON DELETE SET NULL. As a bare uuid it kept pointing at portfolio videos
--     that had since been deleted, so the gallery dimmed those reels as
--     "Added" forever and the creator could never re-import them.

-- 1. Rename in place so existing timestamps survive.
ALTER TABLE "InstagramMediaSyncState"
  RENAME COLUMN "lastFullSyncAt" TO "lastSyncedAt";

ALTER INDEX "InstagramMediaSyncState_lastFullSyncAt_idx"
  RENAME TO "InstagramMediaSyncState_lastSyncedAt_idx";

-- 2a. Clear the pointers that are already dangling. Without this the constraint
--     below cannot be validated: those rows reference ids that no longer exist.
--     This is also the data repair for reels stuck showing "Added".
UPDATE "InstagramMediaItem" i
   SET "importedVideoId" = NULL
 WHERE i."importedVideoId" IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM "CreatorPortfolioVideo" v WHERE v."id" = i."importedVideoId"
   );

-- 2b. Now the database keeps it honest.
ALTER TABLE "InstagramMediaItem"
  ADD CONSTRAINT "InstagramMediaItem_importedVideoId_fkey"
  FOREIGN KEY ("importedVideoId") REFERENCES "CreatorPortfolioVideo"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

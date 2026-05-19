-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN "youtubeUrl" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN "tiktokUrl" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN "snapchatUrl" TEXT;

-- Backfill contact email from account email for existing profiles
UPDATE "CreatorProfile" cp
SET "contactEmail" = u."email"
FROM "User" u
WHERE cp."userId" = u."id"
  AND cp."contactEmail" IS NULL;

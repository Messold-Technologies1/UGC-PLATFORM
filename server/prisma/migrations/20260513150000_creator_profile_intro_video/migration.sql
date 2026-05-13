-- Creator intro video replaces profile image (no data migration: old image URLs are not valid intro videos).
ALTER TABLE "CreatorProfile" ADD COLUMN "introVideoKey" TEXT,
ADD COLUMN "introVideoUrl" TEXT;

ALTER TABLE "CreatorProfile" DROP COLUMN "profileImageKey",
DROP COLUMN "profileImageUrl";

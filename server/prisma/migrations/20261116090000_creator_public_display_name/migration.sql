-- Admin-chosen name reveal for creator public pages.
--
-- Creators are anonymous by default: `publicSlug` is an opaque random token and
-- the public page shows a niche-derived headline. When an admin reveals a name,
-- `publicDisplayName` holds it and `publicNameSlug` becomes the canonical URL
-- segment. `publicSlug` is never rewritten, so links already shared keep
-- working and redirect to the name URL.
--
-- The revealed name is read ONLY by the public profile page. Orders, chat and
-- the brand browse drawer keep using the opaque slug.
ALTER TABLE "CreatorProfile"
  ADD COLUMN "publicDisplayName" TEXT,
  ADD COLUMN "publicNameSlug" TEXT;

CREATE UNIQUE INDEX "CreatorProfile_publicNameSlug_key"
  ON "CreatorProfile" ("publicNameSlug");

-- Admin-chosen name reveal for creator public pages.
--
-- Creators are anonymous by default: `publicSlug` is an opaque random token and
-- the public page shows a niche-derived headline. When an admin reveals a name,
-- `publicNameSlug` holds the URL segment minted from the creator's displayName
-- and becomes the canonical public URL. `publicSlug` is never rewritten, so
-- links already shared keep working and redirect to the name URL.
--
-- Only the slug is stored. The name itself is read live from `displayName`, so
-- there is no second copy that can drift from the profile. A null slug means
-- the creator is anonymous.
--
-- The reveal is read ONLY by the public profile page. Orders, chat and the
-- brand browse drawer keep using the opaque slug.
ALTER TABLE "CreatorProfile"
  ADD COLUMN "publicNameSlug" TEXT;

CREATE UNIQUE INDEX "CreatorProfile_publicNameSlug_key"
  ON "CreatorProfile" ("publicNameSlug");

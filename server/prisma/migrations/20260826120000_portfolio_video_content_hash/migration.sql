-- SHA-256 of the uploaded bytes, used to stop the same file being added to one
-- portfolio twice. Nullable: existing rows predate the guard, and files too
-- large to hash in the browser are stored without one.
ALTER TABLE "CreatorPortfolioVideo" ADD COLUMN "contentHash" TEXT;

-- Postgres treats NULLs as distinct in a unique index, so every existing row
-- and every future unhashed upload coexists here; only two rows with the *same*
-- non-null hash for one creator collide. Duplicates across different creators
-- are untouched — two people may legitimately post the same clip.
CREATE UNIQUE INDEX "CreatorPortfolioVideo_creatorId_contentHash_key"
  ON "CreatorPortfolioVideo"("creatorId", "contentHash");

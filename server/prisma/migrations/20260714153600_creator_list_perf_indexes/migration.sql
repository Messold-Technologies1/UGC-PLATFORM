-- CreateExtension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
-- Matches the browse-list hot path: WHERE "isListed" = true ORDER BY "createdAt" DESC.
CREATE INDEX "CreatorProfile_isListed_createdAt_idx" ON "CreatorProfile"("isListed", "createdAt" DESC);

-- CreateIndex
-- Trigram indexes so the free-text `contains`/ILIKE search in
-- buildCreatorListSearchWhere (displayName/city/stateName/countryName/bio)
-- and buildRestrictionRowMatch (restriction) can use an index instead of a
-- sequential scan. Plain B-tree indexes cannot accelerate ILIKE '%term%'.
CREATE INDEX "CreatorProfile_displayName_trgm_idx" ON "CreatorProfile" USING GIN ("displayName" gin_trgm_ops);
CREATE INDEX "CreatorProfile_city_trgm_idx" ON "CreatorProfile" USING GIN ("city" gin_trgm_ops);
CREATE INDEX "CreatorProfile_stateName_trgm_idx" ON "CreatorProfile" USING GIN ("stateName" gin_trgm_ops);
CREATE INDEX "CreatorProfile_countryName_trgm_idx" ON "CreatorProfile" USING GIN ("countryName" gin_trgm_ops);
CREATE INDEX "CreatorProfile_bio_trgm_idx" ON "CreatorProfile" USING GIN ("bio" gin_trgm_ops);
CREATE INDEX "CreatorRestriction_restriction_trgm_idx" ON "CreatorRestriction" USING GIN ("restriction" gin_trgm_ops);

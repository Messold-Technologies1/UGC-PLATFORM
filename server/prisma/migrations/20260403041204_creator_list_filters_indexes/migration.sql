-- CreateIndex
CREATE INDEX "CreatorPortfolioVideo_visibilityStatus_industryLabel_idx" ON "CreatorPortfolioVideo"("visibilityStatus", "industryLabel");

-- CreateIndex
CREATE INDEX "CreatorProfile_gender_idx" ON "CreatorProfile"("gender");

-- CreateIndex
CREATE INDEX "CreatorProfile_onLocationAvailable_idx" ON "CreatorProfile"("onLocationAvailable");

-- CreateIndex
CREATE INDEX "CreatorProfile_createdAt_idx" ON "CreatorProfile"("createdAt");

-- Fast ILIKE '%substring%' on city (Prisma `contains` + insensitive mode)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "CreatorProfile_city_trgm_idx" ON "CreatorProfile" USING gin ("city" gin_trgm_ops);

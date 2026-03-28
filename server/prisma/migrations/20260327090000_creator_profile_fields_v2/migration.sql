-- Creator profile fields v2: categories/persona/restrictions + on-location; remove service types and age range

-- AlterTable
ALTER TABLE "CreatorProfile"
DROP COLUMN "ageRange",
ADD COLUMN     "onLocationAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onLocationFee" DECIMAL(12,2);

-- DropTable
DROP TABLE "CreatorService";

-- DropTable
DROP TABLE "ServiceType";

-- CreateTable
CREATE TABLE "CreatorCategory" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorPersonaTag" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorPersonaTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorRestriction" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "restriction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorCategorySuggestion" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorCategorySuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorPersonaTagSuggestion" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorPersonaTagSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorRestrictionSuggestion" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorRestrictionSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorCategory_creatorId_category_key" ON "CreatorCategory"("creatorId", "category");

-- CreateIndex
CREATE INDEX "CreatorCategory_category_idx" ON "CreatorCategory"("category");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorPersonaTag_creatorId_tag_key" ON "CreatorPersonaTag"("creatorId", "tag");

-- CreateIndex
CREATE INDEX "CreatorPersonaTag_tag_idx" ON "CreatorPersonaTag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorRestriction_creatorId_restriction_key" ON "CreatorRestriction"("creatorId", "restriction");

-- CreateIndex
CREATE INDEX "CreatorRestriction_restriction_idx" ON "CreatorRestriction"("restriction");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorCategorySuggestion_normalizedName_key" ON "CreatorCategorySuggestion"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorPersonaTagSuggestion_normalizedName_key" ON "CreatorPersonaTagSuggestion"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorRestrictionSuggestion_normalizedName_key" ON "CreatorRestrictionSuggestion"("normalizedName");

-- AddForeignKey
ALTER TABLE "CreatorCategory" ADD CONSTRAINT "CreatorCategory_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorPersonaTag" ADD CONSTRAINT "CreatorPersonaTag_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorRestriction" ADD CONSTRAINT "CreatorRestriction_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


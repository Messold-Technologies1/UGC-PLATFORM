-- CreateEnum
CREATE TYPE "PortfolioVisibilityStatus" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN     "profileImageKey" TEXT,
ADD COLUMN     "profileImageUrl" TEXT;

-- CreateTable
CREATE TABLE "CreatorPortfolioVideo" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "videoKey" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "thumbnailKey" TEXT,
    "thumbnailUrl" TEXT,
    "industryLabel" TEXT,
    "language" TEXT,
    "description" TEXT,
    "visibilityStatus" "PortfolioVisibilityStatus" NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorPortfolioVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorPortfolioVideoTag" (
    "id" UUID NOT NULL,
    "videoId" UUID NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorPortfolioVideoTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioIndustrySuggestion" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioIndustrySuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioTagSuggestion" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioTagSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioLanguageSuggestion" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioLanguageSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreatorPortfolioVideo_creatorId_visibilityStatus_createdAt_idx" ON "CreatorPortfolioVideo"("creatorId", "visibilityStatus", "createdAt");

-- CreateIndex
CREATE INDEX "CreatorPortfolioVideo_creatorId_createdAt_idx" ON "CreatorPortfolioVideo"("creatorId", "createdAt");

-- CreateIndex
CREATE INDEX "CreatorPortfolioVideoTag_tag_idx" ON "CreatorPortfolioVideoTag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorPortfolioVideoTag_videoId_tag_key" ON "CreatorPortfolioVideoTag"("videoId", "tag");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioIndustrySuggestion_normalizedName_key" ON "PortfolioIndustrySuggestion"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioTagSuggestion_normalizedName_key" ON "PortfolioTagSuggestion"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioLanguageSuggestion_normalizedName_key" ON "PortfolioLanguageSuggestion"("normalizedName");

-- AddForeignKey
ALTER TABLE "CreatorPortfolioVideo" ADD CONSTRAINT "CreatorPortfolioVideo_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorPortfolioVideoTag" ADD CONSTRAINT "CreatorPortfolioVideoTag_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "CreatorPortfolioVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

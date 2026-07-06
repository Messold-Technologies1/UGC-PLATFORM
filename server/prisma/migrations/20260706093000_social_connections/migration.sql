-- Social account connections (Instagram now; YouTube/Reddit reserved): OAuth
-- data-source links per creator, plus daily scalar metrics and dated audience
-- demographics snapshots. See schema.prisma for model docs.

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'YOUTUBE', 'REDDIT');

-- CreateEnum
CREATE TYPE "SocialConnectionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'ERROR');

-- CreateTable
CREATE TABLE "SocialConnection" (
    "id" UUID NOT NULL,
    "creatorProfileId" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "username" TEXT,
    "accountType" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[],
    "status" "SocialConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "followersCount" INTEGER,
    "mediaCount" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialMetricSnapshot" (
    "id" UUID NOT NULL,
    "connectionId" UUID NOT NULL,
    "creatorProfileId" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "metricDate" DATE NOT NULL,
    "reach" INTEGER,
    "views" INTEGER,
    "followerCount" INTEGER,
    "followersDelta" INTEGER,
    "profileViews" INTEGER,
    "raw" JSONB,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAudienceSnapshot" (
    "id" UUID NOT NULL,
    "connectionId" UUID NOT NULL,
    "creatorProfileId" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "followerCount" INTEGER,
    "ageBreakdown" JSONB,
    "genderBreakdown" JSONB,
    "cityBreakdown" JSONB,
    "countryBreakdown" JSONB,
    "raw" JSONB,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialAudienceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialConnection_status_idx" ON "SocialConnection"("status");

-- CreateIndex
CREATE INDEX "SocialConnection_creatorProfileId_idx" ON "SocialConnection"("creatorProfileId");

-- CreateIndex
CREATE INDEX "SocialConnection_tokenExpiresAt_idx" ON "SocialConnection"("tokenExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialConnection_platform_providerAccountId_key" ON "SocialConnection"("platform", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialConnection_creatorProfileId_platform_key" ON "SocialConnection"("creatorProfileId", "platform");

-- CreateIndex
CREATE INDEX "SocialMetricSnapshot_creatorProfileId_platform_metricDate_idx" ON "SocialMetricSnapshot"("creatorProfileId", "platform", "metricDate");

-- CreateIndex
CREATE UNIQUE INDEX "SocialMetricSnapshot_connectionId_metricDate_key" ON "SocialMetricSnapshot"("connectionId", "metricDate");

-- CreateIndex
CREATE INDEX "SocialAudienceSnapshot_creatorProfileId_platform_snapshotDa_idx" ON "SocialAudienceSnapshot"("creatorProfileId", "platform", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAudienceSnapshot_connectionId_snapshotDate_key" ON "SocialAudienceSnapshot"("connectionId", "snapshotDate");

-- AddForeignKey
ALTER TABLE "SocialConnection" ADD CONSTRAINT "SocialConnection_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialMetricSnapshot" ADD CONSTRAINT "SocialMetricSnapshot_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "SocialConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAudienceSnapshot" ADD CONSTRAINT "SocialAudienceSnapshot_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "SocialConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

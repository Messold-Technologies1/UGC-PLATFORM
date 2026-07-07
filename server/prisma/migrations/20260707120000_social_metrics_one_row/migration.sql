-- Collapse Instagram metrics to one row per connection: store rolling 30-day
-- totals (reach/views/profileViews) on SocialConnection and drop the per-day
-- SocialMetricSnapshot table. Audience demographics become one row per
-- connection (unique connectionId), overwritten each sync.

-- DropForeignKey
ALTER TABLE "SocialMetricSnapshot" DROP CONSTRAINT "SocialMetricSnapshot_connectionId_fkey";

-- DropIndex
DROP INDEX "SocialAudienceSnapshot_creatorProfileId_platform_snapshotDa_idx";

-- DropIndex
DROP INDEX "SocialAudienceSnapshot_connectionId_snapshotDate_key";

-- AlterTable
ALTER TABLE "SocialConnection" ADD COLUMN     "metricsUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "profileViews30d" INTEGER,
ADD COLUMN     "reach30d" INTEGER,
ADD COLUMN     "views30d" INTEGER;

-- DropTable
DROP TABLE "SocialMetricSnapshot";

-- CreateIndex
CREATE UNIQUE INDEX "SocialAudienceSnapshot_connectionId_key" ON "SocialAudienceSnapshot"("connectionId");

-- CreateIndex
CREATE INDEX "SocialAudienceSnapshot_creatorProfileId_platform_idx" ON "SocialAudienceSnapshot"("creatorProfileId", "platform");


-- AlterTable
ALTER TABLE "CreatorSearchEvent" ADD COLUMN     "agencyId" UUID;

-- CreateIndex
CREATE INDEX "CreatorSearchEvent_agencyId_createdAt_idx" ON "CreatorSearchEvent"("agencyId", "createdAt");

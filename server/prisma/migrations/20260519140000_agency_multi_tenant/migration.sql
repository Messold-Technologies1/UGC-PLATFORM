-- AlterEnum
ALTER TYPE "RoleName" ADD VALUE 'AGENCY';

-- CreateTable
CREATE TABLE "Agency" (
    "id" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "lastActiveBrandProfileId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "BrandProfile" ADD COLUMN "agencyId" UUID,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Agency_ownerUserId_key" ON "Agency"("ownerUserId");
CREATE UNIQUE INDEX "Agency_lastActiveBrandProfileId_key" ON "Agency"("lastActiveBrandProfileId");
CREATE INDEX "Agency_ownerUserId_idx" ON "Agency"("ownerUserId");
CREATE INDEX "BrandProfile_agencyId_idx" ON "BrandProfile"("agencyId");

-- AddForeignKey
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_lastActiveBrandProfileId_fkey" FOREIGN KEY ("lastActiveBrandProfileId") REFERENCES "BrandProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

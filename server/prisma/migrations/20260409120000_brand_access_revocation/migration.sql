-- AlterTable
ALTER TABLE "User"
ADD COLUMN "brandAccessRevokedAt" TIMESTAMP(3),
ADD COLUMN "brandAccessRevokedById" UUID,
ADD COLUMN "brandAccessRevocationReason" TEXT;

-- CreateIndex
CREATE INDEX "User_brandAccessRevokedAt_idx" ON "User"("brandAccessRevokedAt");

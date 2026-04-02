-- AlterTable
ALTER TABLE "Session" ADD COLUMN "activeRoleId" UUID;

-- CreateIndex
CREATE INDEX "Session_userId_activeRoleId_idx" ON "Session"("userId", "activeRoleId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_activeRoleId_fkey" FOREIGN KEY ("activeRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;


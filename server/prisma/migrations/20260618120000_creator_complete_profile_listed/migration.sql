-- AlterTable: add the completeProfile latch + derived isListed gate, drop unused tiktokUrl.
ALTER TABLE "CreatorProfile" DROP COLUMN "tiktokUrl",
ADD COLUMN "completeProfile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isListed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: brand discovery filters solely on this column.
CREATE INDEX "CreatorProfile_isListed_idx" ON "CreatorProfile"("isListed");

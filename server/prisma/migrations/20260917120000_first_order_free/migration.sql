-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN     "firstOrderFreeEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "isFreeOrder" BOOLEAN NOT NULL DEFAULT false;


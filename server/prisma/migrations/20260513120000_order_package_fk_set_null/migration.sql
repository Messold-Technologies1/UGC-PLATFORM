-- Orders keep package snapshots; listing rows may be deleted when creators edit packages.
ALTER TABLE "Order" DROP CONSTRAINT "Order_creatorPackageId_fkey";

ALTER TABLE "Order" ALTER COLUMN "creatorPackageId" DROP NOT NULL;

ALTER TABLE "Order" ADD CONSTRAINT "Order_creatorPackageId_fkey" FOREIGN KEY ("creatorPackageId") REFERENCES "CreatorPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

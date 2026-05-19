-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "logoKey" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "contactFullName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "contactEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "contactPhoneVerified" BOOLEAN NOT NULL DEFAULT false;

-- Backfill defaults for any existing rows (if migration runs on non-empty table)
UPDATE "Agency" SET "contactFullName" = "name" WHERE "contactFullName" = '';
UPDATE "Agency" SET "contactEmail" = (
  SELECT "email" FROM "User" WHERE "User"."id" = "Agency"."ownerUserId"
) WHERE "contactEmail" = '';

ALTER TABLE "Agency" ALTER COLUMN "contactFullName" DROP DEFAULT;
ALTER TABLE "Agency" ALTER COLUMN "contactEmail" DROP DEFAULT;

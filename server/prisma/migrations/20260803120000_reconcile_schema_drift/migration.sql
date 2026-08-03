-- Reconcile live Neon schema with migration history (no-op on DBs that already match).
-- Captures: ContactMessage (applied outside migrations), OrderStatus enum cleanup,
-- dropped DB-level uuid/array defaults (app uses @default(uuid())), CreatorProfile gender index.

-- CreateEnum
CREATE TYPE "ContactMessageStatus" AS ENUM ('PENDING', 'READ');

-- AlterEnum: drop unused CANCELLED / CREATOR_REFUND_DONE labels left by older migrations
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM (
  'PENDING_PAYMENT',
  'BRIEF_SUBMISSION_PENDING',
  'BRIEF_SUBMITTED',
  'BRIEF_ACCEPTED',
  'PRODUCT_SHIPPED',
  'PRODUCT_RECEIVED',
  'DELIVERED',
  'REVISION_REQUESTED',
  'REVISION_SUBMITTED',
  'ACCEPTED',
  'CREATOR_PAYMENT_DONE',
  'DISPUTED',
  'REJECTED',
  'REFUNDED'
);
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TABLE "Order" ALTER COLUMN "preDisputeStatus" TYPE "OrderStatus_new" USING ("preDisputeStatus"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT';
COMMIT;

-- AlterTable: align with Prisma @default(uuid()) / @updatedAt (no DB defaults)
ALTER TABLE "BrandWishlist" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "BrandWishlistCreator" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Brief" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "City" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "aliasesNormalized" DROP DEFAULT;
ALTER TABLE "CreatorAddOnOption" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "CreatorPayoutDetails" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "CreatorRatingReview" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "OrderDelivery" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "OrderRevision" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "State" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "aliasesNormalized" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ContactMessageStatus" NOT NULL DEFAULT 'PENDING',
    "readById" UUID,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");
CREATE INDEX "ContactMessage_status_createdAt_idx" ON "ContactMessage"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "CreatorProfile_gender_idx" ON "CreatorProfile"("gender");

ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_readById_fkey" FOREIGN KEY ("readById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

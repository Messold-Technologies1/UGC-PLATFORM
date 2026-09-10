-- Admins can accept / reject / cancel an order's brief on behalf of the creator
-- or the brand, and every brief-stage action now records the acting user.
--
-- Replaces the free-text `cancelledBy` role string ('BRAND' / 'CREATOR') with
-- the actual acting user id, the attributed side, and a support flag; and adds
-- the same actor pair for brief acceptance. The old role literal is preserved
-- into `cancelledOnBehalfOf` before the column is dropped. The historical acting
-- user id is not recoverable from the role alone, so `cancelledByUserId` stays
-- null for pre-existing rows (none of which were support-driven).
--
-- The `AuditLog` table is removed: it was defined in the schema but never written
-- to anywhere in the application.

-- DropTable
DROP TABLE IF EXISTS "AuditLog";

-- AlterTable: brief-acceptance actor
ALTER TABLE "Order"
  ADD COLUMN "briefAcceptedByUserId" UUID,
  ADD COLUMN "briefAcceptedBySupport" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: cancellation / rejection actor
ALTER TABLE "Order"
  ADD COLUMN "cancelledByUserId" UUID,
  ADD COLUMN "cancelledOnBehalfOf" TEXT,
  ADD COLUMN "cancelledBySupport" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: carry the old role literal into the attributed-side column.
UPDATE "Order"
  SET "cancelledOnBehalfOf" = "cancelledBy"
  WHERE "cancelledBy" IS NOT NULL;

-- DropColumn: the replaced role string
ALTER TABLE "Order" DROP COLUMN "cancelledBy";

-- AddForeignKey
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_cancelledByUserId_fkey"
  FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_briefAcceptedByUserId_fkey"
  FOREIGN KEY ("briefAcceptedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Admins can accept / reject / cancel an order's brief on behalf of the creator
-- or the brand, and every brief-stage action now records the acting user.
--
-- Replaces the free-text `cancelledBy` role string ('BRAND' / 'CREATOR') with
-- the actual acting user id and the attributed side; and adds the acting user
-- for brief acceptance. Whether an action was performed by support is derived
-- from the acting user's role, not stored. The old role literal is preserved
-- into `cancelledOnBehalfOf` before the column is dropped. The historical acting
-- user id is not recoverable from the role alone, so `cancelledByUserId` stays
-- null for pre-existing rows.
--
-- The `AuditLog` table is removed: it was defined in the schema but never written
-- to anywhere in the application.

-- DropTable
DROP TABLE IF EXISTS "AuditLog";

-- AlterTable: brief-acceptance actor
ALTER TABLE "Order"
  ADD COLUMN "briefAcceptedByUserId" UUID;

-- AlterTable: cancellation / rejection actor
ALTER TABLE "Order"
  ADD COLUMN "cancelledByUserId" UUID,
  ADD COLUMN "cancelledOnBehalfOf" TEXT;

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

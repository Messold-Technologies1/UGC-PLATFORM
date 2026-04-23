-- CreateTable
CREATE TABLE "OrderDelivery" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "creatorId" UUID NOT NULL,
  "revisionNumber" INTEGER NOT NULL DEFAULT 0,
  "assets" JSONB NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrderDelivery_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderDelivery"
ADD CONSTRAINT "OrderDelivery_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDelivery"
ADD CONSTRAINT "OrderDelivery_creatorId_fkey"
FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "OrderDelivery_orderId_createdAt_idx" ON "OrderDelivery"("orderId", "createdAt");
CREATE INDEX "OrderDelivery_creatorId_createdAt_idx" ON "OrderDelivery"("creatorId", "createdAt");

-- Create unique constraint per revision
CREATE UNIQUE INDEX "OrderDelivery_orderId_revisionNumber_key"
ON "OrderDelivery"("orderId", "revisionNumber");


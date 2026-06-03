-- CreateTable
CREATE TABLE "OrderRevision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "note" TEXT,
    "requestedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderRevision_orderId_revisionNumber_key" ON "OrderRevision"("orderId", "revisionNumber");

-- CreateIndex
CREATE INDEX "OrderRevision_orderId_createdAt_idx" ON "OrderRevision"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderRevision_requestedByUserId_idx" ON "OrderRevision"("requestedByUserId");

-- AddForeignKey
ALTER TABLE "OrderRevision" ADD CONSTRAINT "OrderRevision_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRevision" ADD CONSTRAINT "OrderRevision_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

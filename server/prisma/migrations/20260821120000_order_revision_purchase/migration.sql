-- CreateEnum
CREATE TYPE "OrderRevisionPurchaseStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "OrderRevisionPurchase" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "revisionsAdded" INTEGER NOT NULL,
    "unitAmountPaise" INTEGER NOT NULL,
    "expectedAmountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "OrderRevisionPurchaseStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderRevisionPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderRevisionPurchase_razorpayOrderId_key" ON "OrderRevisionPurchase"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "OrderRevisionPurchase_orderId_idx" ON "OrderRevisionPurchase"("orderId");

-- AddForeignKey
ALTER TABLE "OrderRevisionPurchase" ADD CONSTRAINT "OrderRevisionPurchase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRevisionPurchase" ADD CONSTRAINT "OrderRevisionPurchase_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

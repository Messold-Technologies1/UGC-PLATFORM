-- AlterTable
ALTER TABLE "Order" ADD COLUMN "usageRightsExtraDays" INTEGER NOT NULL DEFAULT 0;

-- CreateEnum
CREATE TYPE "OrderUsageRightsPurchaseStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "OrderUsageRightsPurchase" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "daysAdded" INTEGER NOT NULL,
    "unitAmountPaise" INTEGER NOT NULL,
    "expectedAmountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "OrderUsageRightsPurchaseStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderUsageRightsPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderUsageRightsPurchase_razorpayOrderId_key" ON "OrderUsageRightsPurchase"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "OrderUsageRightsPurchase_orderId_idx" ON "OrderUsageRightsPurchase"("orderId");

-- AddForeignKey
ALTER TABLE "OrderUsageRightsPurchase" ADD CONSTRAINT "OrderUsageRightsPurchase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderUsageRightsPurchase" ADD CONSTRAINT "OrderUsageRightsPurchase_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

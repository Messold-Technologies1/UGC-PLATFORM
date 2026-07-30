-- CreateEnum
CREATE TYPE "OrderCheckoutBatchStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'FAILED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "checkoutBatchId" UUID;

-- CreateTable
CREATE TABLE "OrderCheckoutBatch" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "status" "OrderCheckoutBatchStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "expectedAmountPaise" INTEGER NOT NULL,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderCheckoutBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderCheckoutBatch_razorpayOrderId_key" ON "OrderCheckoutBatch"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "OrderCheckoutBatch_brandId_createdAt_idx" ON "OrderCheckoutBatch"("brandId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_checkoutBatchId_idx" ON "Order"("checkoutBatchId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_checkoutBatchId_fkey" FOREIGN KEY ("checkoutBatchId") REFERENCES "OrderCheckoutBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCheckoutBatch" ADD CONSTRAINT "OrderCheckoutBatch_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "BrandProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

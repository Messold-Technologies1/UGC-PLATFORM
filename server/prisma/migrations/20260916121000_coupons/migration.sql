-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED', 'PLATFORM_FEE_WAIVER');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "couponCodeSnapshot" TEXT,
ADD COLUMN     "couponId" UUID,
ADD COLUMN     "couponNameSnapshot" TEXT,
ADD COLUMN     "discountAmountPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountTypeSnapshot" "DiscountType",
ADD COLUMN     "grossAmountPaise" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderCheckoutBatch" ADD COLUMN     "couponCodeSnapshot" TEXT,
ADD COLUMN     "couponId" UUID,
ADD COLUMN     "couponNameSnapshot" TEXT,
ADD COLUMN     "discountAmountPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "grossAmountPaise" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Coupon" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" UUID NOT NULL,
    "couponId" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "orderId" UUID,
    "checkoutBatchId" UUID,
    "discountAmountPaise" INTEGER NOT NULL DEFAULT 0,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_active_idx" ON "Coupon"("active");

-- CreateIndex
CREATE INDEX "CouponRedemption_brandId_idx" ON "CouponRedemption"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_couponId_brandId_key" ON "CouponRedemption"("couponId", "brandId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCheckoutBatch" ADD CONSTRAINT "OrderCheckoutBatch_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;


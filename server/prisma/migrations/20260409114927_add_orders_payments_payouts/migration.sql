-- CreateEnum
CREATE TYPE "CreatorFundAccountType" AS ENUM ('BANK', 'UPI');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'BRIEF_SUBMISSION_PENDING', 'BRIEF_SUBMITTED', 'DELIVERED', 'REVISION_REQUESTED', 'REVISION_SUBMITTED', 'ACCEPTED', 'DISPUTED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "OrderDisputeStatus" AS ENUM ('OPEN', 'RESOLVED_CONTINUE', 'RESOLVED_REFUNDED', 'RESOLVED_CLOSED');

-- CreateEnum
CREATE TYPE "OrderDisputeOpenedBy" AS ENUM ('BRAND', 'CREATOR');

-- CreateEnum
CREATE TYPE "CreatorPayoutStatus" AS ENUM ('CREATED', 'PROCESSING', 'PROCESSED', 'FAILED', 'REVERSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CreatorRazorpayContact" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "razorpayContactId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorRazorpayContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorRazorpayFundAccount" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "razorpayFundAccountId" TEXT NOT NULL,
    "type" "CreatorFundAccountType" NOT NULL,
    "accountHolderName" TEXT,
    "accountNumberLast4" TEXT,
    "ifsc" TEXT,
    "vpaMasked" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorRazorpayFundAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "creatorPackageId" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "packageNameSnapshot" TEXT NOT NULL,
    "deliverablesSnapshot" JSONB NOT NULL,
    "priceAmountSnapshot" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "deliveryDaysSnapshot" INTEGER NOT NULL,
    "maxRevisionsSnapshot" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "brief" JSONB,
    "briefSubmittedAt" TIMESTAMP(3),
    "deliveryDeadlineAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpayRefundId" TEXT,
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderDispute" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "status" "OrderDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "openedBy" "OrderDisputeOpenedBy" NOT NULL,
    "reason" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" UUID,
    "resolutionNotes" TEXT,

    CONSTRAINT "OrderDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorPayout" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "orderId" UUID,
    "fundAccountId" UUID NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "purpose" TEXT NOT NULL DEFAULT 'payout',
    "status" "CreatorPayoutStatus" NOT NULL DEFAULT 'CREATED',
    "razorpayPayoutId" TEXT,
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorRazorpayContact_creatorId_key" ON "CreatorRazorpayContact"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorRazorpayContact_razorpayContactId_key" ON "CreatorRazorpayContact"("razorpayContactId");

-- CreateIndex
CREATE INDEX "CreatorRazorpayContact_creatorId_idx" ON "CreatorRazorpayContact"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorRazorpayFundAccount_razorpayFundAccountId_key" ON "CreatorRazorpayFundAccount"("razorpayFundAccountId");

-- CreateIndex
CREATE INDEX "CreatorRazorpayFundAccount_creatorId_isActive_idx" ON "CreatorRazorpayFundAccount"("creatorId", "isActive");

-- CreateIndex
CREATE INDEX "CreatorRazorpayFundAccount_contactId_idx" ON "CreatorRazorpayFundAccount"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_razorpayOrderId_key" ON "Order"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "Order_brandId_createdAt_idx" ON "Order"("brandId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_creatorId_createdAt_idx" ON "Order"("creatorId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_deliveryDeadlineAt_idx" ON "Order"("deliveryDeadlineAt");

-- CreateIndex
CREATE INDEX "OrderDispute_orderId_status_idx" ON "OrderDispute"("orderId", "status");

-- CreateIndex
CREATE INDEX "OrderDispute_status_openedAt_idx" ON "OrderDispute"("status", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorPayout_razorpayPayoutId_key" ON "CreatorPayout"("razorpayPayoutId");

-- CreateIndex
CREATE INDEX "CreatorPayout_creatorId_createdAt_idx" ON "CreatorPayout"("creatorId", "createdAt");

-- CreateIndex
CREATE INDEX "CreatorPayout_status_createdAt_idx" ON "CreatorPayout"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CreatorPayout_orderId_idx" ON "CreatorPayout"("orderId");

-- AddForeignKey
ALTER TABLE "CreatorRazorpayContact" ADD CONSTRAINT "CreatorRazorpayContact_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorRazorpayFundAccount" ADD CONSTRAINT "CreatorRazorpayFundAccount_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorRazorpayFundAccount" ADD CONSTRAINT "CreatorRazorpayFundAccount_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CreatorRazorpayContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "BrandProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_creatorPackageId_fkey" FOREIGN KEY ("creatorPackageId") REFERENCES "CreatorPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDispute" ADD CONSTRAINT "OrderDispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDispute" ADD CONSTRAINT "OrderDispute_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorPayout" ADD CONSTRAINT "CreatorPayout_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorPayout" ADD CONSTRAINT "CreatorPayout_fundAccountId_fkey" FOREIGN KEY ("fundAccountId") REFERENCES "CreatorRazorpayFundAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorPayout" ADD CONSTRAINT "CreatorPayout_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

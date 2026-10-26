-- Travel add-on bought AFTER checkout, from the brief form.
--
-- Shoot location is chosen in the brief, which the brand fills in only once the
-- order is already paid. A brand that picks "Outdoor / Public Location" or
-- "Brand Selected Location" without having selected the creator's "Travel
-- within City" add-on at checkout is asking for an on-location shoot it never
-- paid for, so the brief submit is blocked until this supplemental charge is
-- captured. Mirrors OrderRevisionPurchase / OrderUsageRightsPurchase: its own
-- Razorpay order and verifiable amount, so a dismissed modal never orphans a
-- charge, and the add-on is granted only on the verified webhook.
--
-- Once paid the add-on is folded into the order (addOnsSnapshot,
-- addOnsTotalSnapshot, expectedAmountPaise) so it settles through the existing
-- pricing ledger at the usual 80/20 split, exactly like travel bought at
-- checkout. Safe to mutate expectedAmountPaise here: it is only verified against
-- Razorpay while the order is PENDING_PAYMENT, and travel can only be bought
-- after the base payment is captured.

-- CreateEnum
CREATE TYPE "OrderTravelPurchaseStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "OrderTravelPurchase" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "creatorAddOnId" UUID,
    "nameSnapshot" TEXT NOT NULL,
    "unitAmountPaise" INTEGER NOT NULL,
    "expectedAmountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "OrderTravelPurchaseStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderTravelPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderTravelPurchase_razorpayOrderId_key" ON "OrderTravelPurchase"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "OrderTravelPurchase_orderId_idx" ON "OrderTravelPurchase"("orderId");

-- AddForeignKey
ALTER TABLE "OrderTravelPurchase" ADD CONSTRAINT "OrderTravelPurchase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTravelPurchase" ADD CONSTRAINT "OrderTravelPurchase_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

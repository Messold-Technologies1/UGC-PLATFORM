-- Add-on line items snapshot and expected Razorpay charge (paise) for webhook verification
ALTER TABLE "Order"
ADD COLUMN "addOnsSnapshot" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "addOnsTotalSnapshot" DECIMAL(12,2),
ADD COLUMN "expectedAmountPaise" INTEGER NOT NULL DEFAULT 0;

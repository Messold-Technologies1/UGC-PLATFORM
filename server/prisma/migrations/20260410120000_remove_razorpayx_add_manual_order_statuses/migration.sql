-- Remove RazorpayX payout tables
ALTER TABLE "CreatorPayout" DROP CONSTRAINT IF EXISTS "CreatorPayout_orderId_fkey";
ALTER TABLE "CreatorPayout" DROP CONSTRAINT IF EXISTS "CreatorPayout_creatorId_fkey";
ALTER TABLE "CreatorPayout" DROP CONSTRAINT IF EXISTS "CreatorPayout_fundAccountId_fkey";
DROP TABLE IF EXISTS "CreatorPayout";

ALTER TABLE "CreatorRazorpayFundAccount" DROP CONSTRAINT IF EXISTS "CreatorRazorpayFundAccount_contactId_fkey";
ALTER TABLE "CreatorRazorpayFundAccount" DROP CONSTRAINT IF EXISTS "CreatorRazorpayFundAccount_creatorId_fkey";
DROP TABLE IF EXISTS "CreatorRazorpayFundAccount";

ALTER TABLE "CreatorRazorpayContact" DROP CONSTRAINT IF EXISTS "CreatorRazorpayContact_creatorId_fkey";
DROP TABLE IF EXISTS "CreatorRazorpayContact";

DROP TYPE IF EXISTS "CreatorPayoutStatus";
DROP TYPE IF EXISTS "CreatorFundAccountType";

-- Manual creator payout bookkeeping (admin marks after bank transfer)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "creatorPaidAt" TIMESTAMP(3);

-- New order lifecycle values (manual payout + manual refund path)
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CREATOR_PAYMENT_DONE';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CREATOR_REFUND_DONE';

-- Reward credit granted on successful order completion. It lives inside the
-- existing credit balance (so checkout needs no changes) but may never leave as
-- money, so the wallet tracks a non-withdrawable sub-bucket alongside the hold.
--
--   spendable  = balancePaise - heldPaise                (unchanged)
--   refundable = balancePaise - heldPaise - promoPaise   (new; caps withdrawals)
--
-- The unique index that keeps the reward to one per order filters on the enum
-- value added here, and Postgres refuses to USE a new enum value in the
-- transaction that adds it. It therefore ships as its own migration
-- (20261008130000_wallet_promo_credit_index), which runs in a later
-- transaction — by which time this ALTER TYPE has committed.

-- AlterEnum
ALTER TYPE "WalletTransactionType" ADD VALUE 'ORDER_COMPLETION_CREDIT';

-- AlterTable
ALTER TABLE "BrandWallet" ADD COLUMN     "promoPaise" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WalletTransaction" ADD COLUMN     "promoPaise" INTEGER NOT NULL DEFAULT 0;

-- The promo bucket is non-negative and, together with funds held for pending
-- withdrawals, never exceeds the balance (defence in depth alongside the
-- guarded updates in WalletService, mirroring the heldPaise constraints).
ALTER TABLE "BrandWallet" ADD CONSTRAINT "BrandWallet_promoPaise_nonnegative" CHECK ("promoPaise" >= 0);
ALTER TABLE "BrandWallet" ADD CONSTRAINT "BrandWallet_held_plus_promo_not_exceed_balance" CHECK ("heldPaise" + "promoPaise" <= "balancePaise");

-- Reward credit granted on successful order completion. It lives inside the
-- existing credit balance (so checkout needs no changes) but may never leave as
-- money, so the wallet tracks a non-withdrawable sub-bucket alongside the hold.
--
--   spendable  = balancePaise - heldPaise                (unchanged)
--   refundable = balancePaise - heldPaise - promoPaise   (new; caps withdrawals)

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

-- One completion reward per order, enforced by the database: a retried accept
-- or a concurrent double-accept can never pay the brand twice. Partial, because
-- every other movement type legitimately repeats on the same order (a checkout
-- debit can be reversed and re-taken).
CREATE UNIQUE INDEX "WalletTransaction_one_completion_credit_per_order"
  ON "WalletTransaction" ("orderId")
  WHERE "type" = 'ORDER_COMPLETION_CREDIT';

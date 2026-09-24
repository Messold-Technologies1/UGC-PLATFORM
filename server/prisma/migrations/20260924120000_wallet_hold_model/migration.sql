-- AlterTable
ALTER TABLE "BrandWallet" ADD COLUMN     "heldPaise" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WalletWithdrawal" ADD COLUMN     "holdModel" BOOLEAN NOT NULL DEFAULT true;


-- Existing withdrawals used the legacy debit-on-request model (money removed
-- from balance at request, credited back on rejection). Mark them so they keep
-- that behaviour; only new withdrawals use the hold model.
UPDATE "WalletWithdrawal" SET "holdModel" = false;

-- Held funds are non-negative and never exceed the balance (defence in depth
-- alongside the guarded updates in WalletService).
ALTER TABLE "BrandWallet" ADD CONSTRAINT "BrandWallet_heldPaise_nonnegative" CHECK ("heldPaise" >= 0);
ALTER TABLE "BrandWallet" ADD CONSTRAINT "BrandWallet_held_not_exceed_balance" CHECK ("heldPaise" <= "balancePaise");

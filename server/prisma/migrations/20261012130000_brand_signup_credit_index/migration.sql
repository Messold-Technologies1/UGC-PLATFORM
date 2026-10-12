-- One welcome reward per wallet, enforced by the database. A wallet belongs to
-- exactly one brand (BrandWallet.brandId is unique), so this is "one per brand":
-- a retried registration, or two requests racing, can never pay twice.
--
-- Partial, because every other movement type legitimately repeats on a wallet.
-- Separate from the migration that adds 'BRAND_SIGNUP_CREDIT' because Postgres
-- rejects a new enum value used in the same transaction that added it; each
-- migration file is its own transaction.

CREATE UNIQUE INDEX "WalletTransaction_one_signup_credit_per_wallet"
  ON "WalletTransaction" ("walletId")
  WHERE "type" = 'BRAND_SIGNUP_CREDIT';

-- One welcome reward per wallet, enforced by the database. A wallet belongs to
-- exactly one brand or one agency (BrandWallet.brandId and .agencyId are both
-- unique), so this is "one per buyer": a retried registration, or two requests
-- racing, can never pay twice.
--
-- Partial, because every other movement type legitimately repeats on a wallet.
-- Separate from the migration that adds 'SIGNUP_WELCOME_CREDIT' because Postgres
-- rejects a new enum value used in the same transaction that added it; each
-- migration file is its own transaction.

CREATE UNIQUE INDEX "WalletTransaction_one_signup_welcome_credit_per_wallet"
  ON "WalletTransaction" ("walletId")
  WHERE "type" = 'SIGNUP_WELCOME_CREDIT';

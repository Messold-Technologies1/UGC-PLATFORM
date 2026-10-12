-- Welcome reward granted once when a brand or an agency finishes registering.
-- Non-withdrawable, like the order-completion reward: it joins
-- BrandWallet.promoPaise as well as the balance, so it can be spent on an order
-- but never paid out. A signup bonus that could be withdrawn would pay anyone
-- who registers.
--
-- The value is named for the event, not the buyer type, because one wallet
-- belongs to either a brand or an agency and both earn it on the same terms.
--
-- The unique index that keeps it to one per wallet filters on the enum value
-- added here, and Postgres refuses to USE a new enum value in the transaction
-- that adds it. It therefore ships as its own migration
-- (20261012130000_signup_welcome_credit_index), which runs in a later
-- transaction — by which time this ALTER TYPE has committed.

-- AlterEnum
ALTER TYPE "WalletTransactionType" ADD VALUE 'SIGNUP_WELCOME_CREDIT';

-- Creators outside India price in their own currency.
--
-- `priceAmount` stays rupees and stays the price: it is what brands see, what
-- Razorpay charges, and what fees and payouts are built on. For a creator
-- outside India it is a conversion of `priceAmountOriginal`, refreshed every
-- night so it tracks the market without the amount ever changing between the
-- price a brand browsed and the price they pay.
--
-- `priceInrUpdatedAt` records when that conversion was last refreshed. It is
-- there so a silently failing refresh is visible as a stale timestamp rather
-- than as prices that quietly stopped tracking the market.
--
-- Existing rows are rupee prices, which is exactly what the default says, so
-- no backfill is needed.
ALTER TABLE "CreatorPackage"
  ADD COLUMN "priceCurrency" TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN "priceAmountOriginal" DECIMAL(12,2),
  ADD COLUMN "priceInrUpdatedAt" TIMESTAMP(3);

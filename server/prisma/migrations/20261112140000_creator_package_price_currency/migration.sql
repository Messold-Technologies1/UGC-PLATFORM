-- Creators outside India price in their own currency. `priceAmount` stays
-- rupees -- it is what orders, fees, payouts and the browse price filter are
-- built on -- and these two record what was actually typed, so the pricing
-- form can show it back to them.
--
-- Existing rows are rupee prices, which is exactly what the default says.
ALTER TABLE "CreatorPackage"
  ADD COLUMN "priceCurrency" TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN "priceAmountOriginal" DECIMAL(12,2);

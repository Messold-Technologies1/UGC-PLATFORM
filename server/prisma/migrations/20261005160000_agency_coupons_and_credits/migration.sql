-- Coupons and store-credit wallets can belong to a brand OR an agency.

-- CouponRedemption: brandId optional + agencyId
ALTER TABLE "CouponRedemption" ALTER COLUMN "brandId" DROP NOT NULL;
ALTER TABLE "CouponRedemption" ADD COLUMN IF NOT EXISTS "agencyId" UUID;

ALTER TABLE "CouponRedemption" DROP CONSTRAINT IF EXISTS "CouponRedemption_brandId_fkey";
ALTER TABLE "CouponRedemption"
  ADD CONSTRAINT "CouponRedemption_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "BrandProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CouponRedemption" DROP CONSTRAINT IF EXISTS "CouponRedemption_agencyId_fkey";
ALTER TABLE "CouponRedemption"
  ADD CONSTRAINT "CouponRedemption_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "Agency"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep brand unique; add agency unique. Postgres treats NULLs as distinct in unique indexes.
CREATE UNIQUE INDEX IF NOT EXISTS "CouponRedemption_couponId_agencyId_key"
  ON "CouponRedemption"("couponId", "agencyId");
CREATE INDEX IF NOT EXISTS "CouponRedemption_agencyId_idx" ON "CouponRedemption"("agencyId");

-- BrandWallet: brandId optional + agencyId
ALTER TABLE "BrandWallet" ALTER COLUMN "brandId" DROP NOT NULL;
ALTER TABLE "BrandWallet" ADD COLUMN IF NOT EXISTS "agencyId" UUID;

ALTER TABLE "BrandWallet" DROP CONSTRAINT IF EXISTS "BrandWallet_agencyId_fkey";
ALTER TABLE "BrandWallet"
  ADD CONSTRAINT "BrandWallet_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "Agency"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "BrandWallet_agencyId_key" ON "BrandWallet"("agencyId");
CREATE INDEX IF NOT EXISTS "BrandWallet_agencyId_idx" ON "BrandWallet"("agencyId");

-- WalletWithdrawal: brandId optional + agencyId
ALTER TABLE "WalletWithdrawal" ALTER COLUMN "brandId" DROP NOT NULL;
ALTER TABLE "WalletWithdrawal" ADD COLUMN IF NOT EXISTS "agencyId" UUID;

ALTER TABLE "WalletWithdrawal" DROP CONSTRAINT IF EXISTS "WalletWithdrawal_agencyId_fkey";
ALTER TABLE "WalletWithdrawal"
  ADD CONSTRAINT "WalletWithdrawal_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "Agency"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "WalletWithdrawal_agencyId_createdAt_idx"
  ON "WalletWithdrawal"("agencyId", "createdAt");

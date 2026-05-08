-- Briefs: normalized campaign briefs reusable across orders

DO $$ BEGIN
  CREATE TYPE "BriefShootLocationKind" AS ENUM (
    'CREATOR_OWN_SETUP',
    'OUTDOOR_PUBLIC_LOCATION',
    'BRAND_SELECTED_LOCATION',
    'CREATOR_DECIDES'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "BriefDurationBucket" AS ENUM (
    'SEC_0_15',
    'SEC_15_30',
    'SEC_30_45',
    'SEC_45_60',
    'SEC_60_100',
    'NOT_SURE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "BriefContentType" AS ENUM (
    'TALKING_VIDEO',
    'PRODUCT_DEMO',
    'TESTIMONIAL',
    'AESTHETIC_REEL',
    'UGC_AD',
    'CREATOR_DECIDES'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "BriefToneStyle" AS ENUM (
    'FUNNY',
    'EMOTIONAL',
    'PREMIUM',
    'CASUAL',
    'TRENDY',
    'CREATOR_DECIDES'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "briefId" UUID;

CREATE TABLE IF NOT EXISTS "Brief" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "brandId" UUID NOT NULL,
  "brandName" TEXT,
  "brandPronunciation" TEXT,
  "brandPronunciationAudioKey" TEXT,
  "brandPronunciationAudioUrl" TEXT,
  "industry" TEXT,
  "brandLogoKey" TEXT,
  "brandLogoUrl" TEXT,
  "productName" TEXT,
  "productDescription" TEXT,
  "productPageUrl" TEXT,
  "shootLocationKind" "BriefShootLocationKind" DEFAULT 'CREATOR_DECIDES',
  "shootLocationAddress" TEXT,
  "durationBucket" "BriefDurationBucket" DEFAULT 'NOT_SURE',
  "contentType" "BriefContentType" DEFAULT 'CREATOR_DECIDES',
  "toneStyle" "BriefToneStyle" DEFAULT 'CREATOR_DECIDES',
  "referenceLinks" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "finalNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Brief_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Brief"
  ADD CONSTRAINT "Brief_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "BrandProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Order"
  ADD CONSTRAINT "Order_briefId_fkey"
  FOREIGN KEY ("briefId") REFERENCES "Brief"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "Order_briefId_idx" ON "Order"("briefId");
CREATE INDEX IF NOT EXISTS "Brief_brandId_createdAt_idx" ON "Brief"("brandId", "createdAt");


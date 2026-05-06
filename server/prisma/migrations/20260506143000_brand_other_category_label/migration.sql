-- BrandProfile: support custom "Other" category label

ALTER TABLE "BrandProfile"
ADD COLUMN IF NOT EXISTS "otherCategoryLabel" TEXT;


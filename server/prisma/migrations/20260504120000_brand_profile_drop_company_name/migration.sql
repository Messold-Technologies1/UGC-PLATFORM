-- Use stored company name as brand name when brandName was left empty.
UPDATE "BrandProfile"
SET "brandName" = TRIM("companyName")
WHERE "brandName" IS NULL OR TRIM("brandName") = '';

UPDATE "BrandProfile"
SET "brandName" = 'Brand'
WHERE "brandName" IS NULL OR TRIM("brandName") = '';

ALTER TABLE "BrandProfile" DROP COLUMN "companyName";
ALTER TABLE "BrandProfile" ALTER COLUMN "brandName" SET NOT NULL;

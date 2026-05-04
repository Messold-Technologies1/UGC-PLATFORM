-- CreateEnum
CREATE TYPE "BrandCategory" AS ENUM (
  'APPAREL_AND_FASHION',
  'ELECTRONICS_AND_GADGETS',
  'HEALTH_AND_BEAUTY',
  'FOOD_AND_BEVERAGES',
  'HOME_AND_LIFESTYLE',
  'SPORTS_AND_FITNESS',
  'TOYS_AND_KIDS',
  'PETS_AND_ANIMALS',
  'AUTOMOBILE_AND_VEHICLES',
  'REAL_ESTATE',
  'RESTAURANTS_AND_CAFES',
  'CLINICS_AND_HEALTHCARE',
  'SALONS_AND_PERSONAL_CARE',
  'EDUCATION_AND_COACHING',
  'TRAVEL_AND_HOSPITALITY',
  'LOCAL_BUSINESSES',
  'SAAS_AND_APPS',
  'PROFESSIONAL_SERVICES',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "BrandProductType" AS ENUM ('PHYSICAL', 'DIGITAL', 'BOTH');

-- AlterTable
ALTER TABLE "BrandProfile" ADD COLUMN "contactFullName" TEXT;
ALTER TABLE "BrandProfile" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "BrandProfile" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "BrandProfile" ADD COLUMN "brandName" TEXT;
ALTER TABLE "BrandProfile" ADD COLUMN "brandPronunciation" TEXT;
ALTER TABLE "BrandProfile" ADD COLUMN "instagramUrl" TEXT;
ALTER TABLE "BrandProfile" ADD COLUMN "productType" "BrandProductType";

-- CreateTable
CREATE TABLE "BrandProfileBrandCategory" (
    "id" UUID NOT NULL,
    "brandProfileId" UUID NOT NULL,
    "category" "BrandCategory" NOT NULL,

    CONSTRAINT "BrandProfileBrandCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandProfileBrandCategory_brandProfileId_category_key" ON "BrandProfileBrandCategory"("brandProfileId", "category");

-- CreateIndex
CREATE INDEX "BrandProfileBrandCategory_brandProfileId_idx" ON "BrandProfileBrandCategory"("brandProfileId");

-- AddForeignKey
ALTER TABLE "BrandProfileBrandCategory" ADD CONSTRAINT "BrandProfileBrandCategory_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Brand name is optional at signup; brands set it later in profile settings.
ALTER TABLE "BrandProfile" ALTER COLUMN "brandName" DROP NOT NULL;

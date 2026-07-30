-- AlterTable
ALTER TABLE "BrandWishlistCreator" ADD COLUMN "selectedAddOnIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];

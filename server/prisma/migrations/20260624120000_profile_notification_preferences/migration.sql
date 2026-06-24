-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN     "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "BrandProfile" ADD COLUMN     "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Existing profiles stay opted out until they enable notifications in settings or re-register.
UPDATE "CreatorProfile" SET "emailNotificationsEnabled" = false, "whatsappNotificationsEnabled" = false;
UPDATE "BrandProfile" SET "emailNotificationsEnabled" = false, "whatsappNotificationsEnabled" = false;

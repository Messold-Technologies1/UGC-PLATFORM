-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Existing agencies stay opted IN, unlike the 2026-06 brand/creator backfill.
-- Until now the send gates let every agency through unconditionally, so these
-- rows have been receiving order mail and WhatsApp all along; defaulting them
-- to false would silently cut off agencies that never asked to be cut off, and
-- there is no settings screen yet for them to turn it back on.
UPDATE "Agency" SET "emailNotificationsEnabled" = true, "whatsappNotificationsEnabled" = true;

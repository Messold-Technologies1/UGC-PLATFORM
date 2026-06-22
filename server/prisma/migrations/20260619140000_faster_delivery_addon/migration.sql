-- AlterTable: faster-delivery add-on support.
ALTER TABLE "CreatorAddOn" ADD COLUMN "deliveryDays" INTEGER;
ALTER TABLE "CreatorAddOnOption" ADD COLUMN "affectsDeliveryDays" BOOLEAN NOT NULL DEFAULT false;

-- Rename the faster-delivery catalog option (days are now creator-defined) and
-- flag it as delivery-affecting. No-op on a fresh DB; the seed then creates it.
UPDATE "CreatorAddOnOption"
SET "slug" = 'faster_delivery',
    "name" = 'Faster Delivery',
    "affectsDeliveryDays" = true
WHERE "slug" = 'faster_delivery_2_3_days';

-- Backfill: existing creators' Faster Delivery add-ons had no deliveryDays, so
-- they charged the brand without speeding anything up. Set a safe value
-- (package - 1, capped at 3, always < package) and normalize the name.
-- Packages of 1 day can't be beaten, so those rows stay NULL (inert) until the
-- creator re-edits and sets a valid value (enforced by the new validation).
UPDATE "CreatorAddOn" a
SET "deliveryDays" = LEAST(3, p."deliveryDays" - 1),
    "name" = 'Faster Delivery'
FROM "CreatorPackage" p
WHERE p."creatorId" = a."creatorId"
  AND a."name" ILIKE 'Faster Delivery%'
  AND a."deliveryDays" IS NULL
  AND p."deliveryDays" > 1;

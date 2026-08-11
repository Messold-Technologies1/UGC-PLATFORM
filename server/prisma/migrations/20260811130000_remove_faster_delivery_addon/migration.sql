-- Faster Delivery is retired as an add-on.
-- 1) Remove the Faster Delivery add-on from every existing creator's offerings.
DELETE FROM "CreatorAddOn"
WHERE "name" = 'Faster Delivery' OR "deliveryDays" IS NOT NULL;

-- 2) Remove the catalog option.
DELETE FROM "CreatorAddOnOption" WHERE "slug" = 'faster_delivery';

-- 3) Drop the delivery-affecting mechanism entirely (only Faster Delivery used it).
ALTER TABLE "CreatorAddOn" DROP COLUMN "deliveryDays";

ALTER TABLE "CreatorAddOnOption" DROP COLUMN "affectsDeliveryDays";

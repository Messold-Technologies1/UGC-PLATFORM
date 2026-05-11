ALTER TABLE "Order" ADD COLUMN "requiresPhysicalProductShipment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "courierName" TEXT;
ALTER TABLE "Order" ADD COLUMN "trackingId" TEXT;
ALTER TABLE "Order" ADD COLUMN "dispatchedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "productReceivedAt" TIMESTAMP(3);

UPDATE "Order" o
SET "requiresPhysicalProductShipment" = b."willShipPhysicalProductToCreator"
FROM "Brief" b
WHERE o."briefId" = b.id;

-- Backfill `Order.preDisputeStatus` for disputes opened before the column
-- existed (20260717130000_add_order_pre_dispute_status added it without one).
--
-- Resolving such a dispute fell back to a flat DELIVERED, which armed the
-- auto-accept clock on an order that may never have been delivered; the sweep
-- then accepted it, paid the brand its completion reward and published the
-- "delivery" to the creator's portfolio. The service no longer trusts that
-- fallback, and this removes the rows that would have hit it.
--
-- Same rule as disputeRestoreFallbackStatus() in orders.service.ts: a real
-- delivery goes back to DELIVERED, anything else returns to the state its
-- creator can submit from.
UPDATE "Order"
   SET "preDisputeStatus" = CASE
         WHEN "deliveredAt" IS NOT NULL THEN 'DELIVERED'::"OrderStatus"
         WHEN "requiresPhysicalProductShipment" THEN 'PRODUCT_RECEIVED'::"OrderStatus"
         ELSE 'BRIEF_ACCEPTED'::"OrderStatus"
       END
 WHERE status = 'DISPUTED'
   AND "preDisputeStatus" IS NULL;

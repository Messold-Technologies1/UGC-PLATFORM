-- Store the order status captured when a dispute is opened so that resolving
-- the dispute in the creator's favour ("continue") or an opener withdrawal can
-- restore the order to its pre-dispute state.
ALTER TABLE "Order" ADD COLUMN "preDisputeStatus" "OrderStatus";

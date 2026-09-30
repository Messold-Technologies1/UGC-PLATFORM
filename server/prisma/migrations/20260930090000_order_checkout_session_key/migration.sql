-- Identifies one brand-initiated checkout attempt, so checkout can tell a
-- double-click (same key → reuse the draft) from a deliberate second order
-- (new key → a separate order). Nullable: existing orders and bulk-checkout
-- children have no key, and a request without one keeps the previous
-- behaviour by matching only other keyless drafts.
ALTER TABLE "Order" ADD COLUMN "checkoutSessionKey" UUID;

-- Checkout looks up a brand's open drafts with one creator on every call
-- (brandId + creatorId + status); that query had no supporting index.
CREATE INDEX "Order_brandId_creatorId_status_idx" ON "Order"("brandId", "creatorId", "status");

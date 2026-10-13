-- Meta attribution captured at checkout and replayed on the server-side
-- Purchase conversion (see META_TRACKING.md).
--
-- The Purchase event fires from a Razorpay webhook, or when a coupon or store
-- credit places the order outright — neither has a browser request to read the
-- buyer's _fbp / _fbc cookies from. Storing them on the order at checkout is
-- what lets the sale attribute to the ad the buyer originally clicked.
--
-- Nullable and backfill-free: existing orders keep NULL, and an ad-blocked
-- browser has no cookies to send, so the event still goes out matching on the
-- buyer's hashed email, phone and name alone.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "metaFbc" TEXT,
ADD COLUMN     "metaFbp" TEXT;

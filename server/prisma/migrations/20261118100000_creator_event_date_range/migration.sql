-- Optional date range on an event post, and feed expiry from it.
--
-- Both columns are nullable, and independently so. A post like "set up a home
-- studio" is about nothing dated; requiring a range would mean inventing one,
-- and every row written before this migration has neither.
--
-- Only `endsOn` governs visibility: once it is past, the post drops out of
-- the brand feed, because a trip that finished last week is noise to a brand
-- browsing today. `startsOn` deliberately does not gate — a post about next
-- week's travel is useful precisely before it starts. A null `endsOn` never
-- expires, so existing rows keep behaving exactly as they did.
--
-- DATE, not TIMESTAMP: "ends on the 20th" should mean the whole of the 20th,
-- not an instant in it. Matches CreatorUnavailability, which stores its range
-- the same way.
ALTER TABLE "CreatorEvent"
  ADD COLUMN "startsOn" DATE,
  ADD COLUMN "endsOn"   DATE;

-- Serves the feed's expiry filter.
CREATE INDEX "CreatorEvent_endsOn_idx" ON "CreatorEvent" ("endsOn");

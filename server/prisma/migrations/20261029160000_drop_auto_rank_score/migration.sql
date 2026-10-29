-- The browse reshuffle no longer computes a single number.
--
-- It was a weighted sum of the five signals, which meant enough profile views
-- could stand in for a completed order. The five are now read strictly in
-- order instead — orders decide it, and the next signal only breaks a tie in
-- the one above — so there is no score left to store and nothing reads this
-- column. Position is the answer to "why is this creator here", and `rank`
-- already holds it.
ALTER TABLE "CreatorFeature" DROP COLUMN IF EXISTS "autoRankScore";

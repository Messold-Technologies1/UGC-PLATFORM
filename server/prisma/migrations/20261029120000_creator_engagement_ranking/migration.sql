-- Fortnightly reshuffle of the browse order, ranked on what brands actually do.
--
-- The order brands see was hand-dragged by an admin and then stayed put. It is
-- now recomputed every fortnight from a weighted score over the last 90 days:
-- completed orders, initiated checkouts, add-to-carts, wishlist saves and
-- profile views, in that order of weight.
--
-- Two of those five were recorded nowhere. A profile view and an add-to-cart
-- were fire-and-forget pixel calls to Meta, and a wishlist save left only live
-- membership, which un-saving deletes — so none of them could be counted over
-- a window. CreatorEngagementDaily keeps them, bucketed by day rather than one
-- row per event: a popular creator draws thousands of views a month and the
-- ranking only ever reads a sum over a date range.
--
-- Orders and checkouts need no new storage; they are Order rows already.
--
-- On CreatorFeature, `autoRankedAt` separates "the ranking put this creator
-- here" from `featuredById`'s "a person did", and `autoRankScore` keeps the
-- number the ranking decided on so an admin can see why a card sits where it
-- does.

-- AlterTable
ALTER TABLE "CreatorFeature"
  ADD COLUMN "autoRankedAt" TIMESTAMP(3),
  ADD COLUMN "autoRankScore" INTEGER;

-- CreateTable
CREATE TABLE "CreatorEngagementDaily" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "day" DATE NOT NULL,
    "profileViews" INTEGER NOT NULL DEFAULT 0,
    "addToCarts" INTEGER NOT NULL DEFAULT 0,
    "wishlistAdds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorEngagementDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorEngagementDaily_creatorId_day_key"
  ON "CreatorEngagementDaily"("creatorId", "day");

-- CreateIndex
CREATE INDEX "CreatorEngagementDaily_day_idx" ON "CreatorEngagementDaily"("day");

-- AddForeignKey
ALTER TABLE "CreatorEngagementDaily"
  ADD CONSTRAINT "CreatorEngagementDaily_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the wishlist column from the saves that still exist, so the first
-- reshuffle is not blind to every creator saved before today. Un-saved rows are
-- gone and cannot be recovered; this is the best history available.
INSERT INTO "CreatorEngagementDaily" ("id", "creatorId", "day", "wishlistAdds", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "creatorId", "createdAt"::date, COUNT(*), NOW(), NOW()
FROM "BrandWishlistCreator"
GROUP BY "creatorId", "createdAt"::date;

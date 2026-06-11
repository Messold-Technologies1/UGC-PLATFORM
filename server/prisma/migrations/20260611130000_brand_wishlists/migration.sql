-- Brand wishlists: saved creator shortlists with optional public share links

CREATE TABLE IF NOT EXISTS "BrandWishlist" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "brandId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "shareToken" TEXT,
  "shareEnabled" BOOLEAN NOT NULL DEFAULT false,
  "sharedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BrandWishlist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BrandWishlistCreator" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "wishlistId" UUID NOT NULL,
  "creatorId" UUID NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BrandWishlistCreator_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BrandWishlist_shareToken_key"
  ON "BrandWishlist"("shareToken");

CREATE UNIQUE INDEX IF NOT EXISTS "BrandWishlist_brandId_name_key"
  ON "BrandWishlist"("brandId", "name");

CREATE INDEX IF NOT EXISTS "BrandWishlist_brandId_createdAt_idx"
  ON "BrandWishlist"("brandId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "BrandWishlistCreator_wishlistId_creatorId_key"
  ON "BrandWishlistCreator"("wishlistId", "creatorId");

CREATE INDEX IF NOT EXISTS "BrandWishlistCreator_creatorId_idx"
  ON "BrandWishlistCreator"("creatorId");

CREATE INDEX IF NOT EXISTS "BrandWishlistCreator_wishlistId_sortOrder_idx"
  ON "BrandWishlistCreator"("wishlistId", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "BrandWishlist"
  ADD CONSTRAINT "BrandWishlist_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "BrandProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "BrandWishlistCreator"
  ADD CONSTRAINT "BrandWishlistCreator_wishlistId_fkey"
  FOREIGN KEY ("wishlistId") REFERENCES "BrandWishlist"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "BrandWishlistCreator"
  ADD CONSTRAINT "BrandWishlistCreator_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

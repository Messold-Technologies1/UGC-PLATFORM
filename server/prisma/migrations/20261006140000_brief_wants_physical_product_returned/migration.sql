-- Brief: optional return of physical product after shoot (brand/agency arranges shipping)

ALTER TABLE "Brief"
  ADD COLUMN IF NOT EXISTS "wantsPhysicalProductReturned" BOOLEAN NOT NULL DEFAULT false;

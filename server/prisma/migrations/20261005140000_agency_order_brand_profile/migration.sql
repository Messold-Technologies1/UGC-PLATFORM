-- Internal BrandProfile per agency for orders/checkout/wallet.
-- Client brand names stay on Agency.brandNames / Brief.brandName.

ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "orderBrandProfileId" UUID;

-- Backfill order brand profiles for existing agencies that lack one.
DO $$
DECLARE
  agency_row RECORD;
  new_profile_id UUID;
BEGIN
  FOR agency_row IN
    SELECT id, name, logo_key, logo_url, website, contact_full_name, contact_email, contact_phone
    FROM (
      SELECT
        a.id,
        a.name,
        a."logoKey" AS logo_key,
        a."logoUrl" AS logo_url,
        a.website,
        a."contactFullName" AS contact_full_name,
        a."contactEmail" AS contact_email,
        a."contactPhone" AS contact_phone
      FROM "Agency" a
      WHERE a."orderBrandProfileId" IS NULL
    ) s
  LOOP
    new_profile_id := gen_random_uuid();
    INSERT INTO "BrandProfile" (
      id,
      "brandName",
      "logoKey",
      "logoUrl",
      website,
      "contactFullName",
      "contactEmail",
      "contactPhone",
      "emailNotificationsEnabled",
      "whatsappNotificationsEnabled",
      "createdAt",
      "updatedAt"
    ) VALUES (
      new_profile_id,
      agency_row.name,
      agency_row.logo_key,
      agency_row.logo_url,
      agency_row.website,
      agency_row.contact_full_name,
      agency_row.contact_email,
      agency_row.contact_phone,
      true,
      false,
      NOW(),
      NOW()
    );
    UPDATE "Agency"
    SET "orderBrandProfileId" = new_profile_id
    WHERE id = agency_row.id;
  END LOOP;
END $$;

ALTER TABLE "Agency"
  DROP CONSTRAINT IF EXISTS "Agency_orderBrandProfileId_fkey";
ALTER TABLE "Agency"
  ADD CONSTRAINT "Agency_orderBrandProfileId_fkey"
  FOREIGN KEY ("orderBrandProfileId") REFERENCES "BrandProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "Agency_orderBrandProfileId_key"
  ON "Agency"("orderBrandProfileId");

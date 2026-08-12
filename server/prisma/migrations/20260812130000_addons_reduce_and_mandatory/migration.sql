-- Reduce the add-on catalog to three (Revision, Usage Rights extra 30 days,
-- Travel within City) and introduce a `mandatory` flag. Revision and Usage
-- Rights become mandatory (creators must price them before going live); Travel
-- within City stays optional.

-- 1. New mandatory flag on the catalog.
ALTER TABLE "CreatorAddOnOption"
  ADD COLUMN "mandatory" BOOLEAN NOT NULL DEFAULT false;

-- 2. Rename existing per-creator add-on rows to the new canonical names so
--    creators keep their configured prices.
UPDATE "CreatorAddOn" SET "name" = 'Revision'
  WHERE "name" = 'Extra Revision';
UPDATE "CreatorAddOn" SET "name" = 'Usage Rights extra 30 days'
  WHERE "name" = 'Paid Ads Usage (30 days)';
UPDATE "CreatorAddOn" SET "name" = 'Travel within City'
  WHERE "name" = 'On-location Shoot (25 km)';

-- 3. Drop the retired add-ons from existing creators.
DELETE FROM "CreatorAddOn"
  WHERE "name" IN ('Advanced Editing', 'Raw File Usage');

-- 4. Reduce and relabel the catalog. (The seed re-upserts these, but keep the
--    DB correct even if the seed is not re-run.)
DELETE FROM "CreatorAddOnOption"
  WHERE "slug" IN ('advanced_editing', 'raw_file_usage');

UPDATE "CreatorAddOnOption"
  SET "name" = 'Revision', "mandatory" = true, "sortOrder" = 0
  WHERE "slug" = 'extra_revision';
UPDATE "CreatorAddOnOption"
  SET "name" = 'Usage Rights extra 30 days', "mandatory" = true, "sortOrder" = 1
  WHERE "slug" = 'paid_ads_usage_30_days';
UPDATE "CreatorAddOnOption"
  SET "name" = 'Travel within City', "mandatory" = false, "sortOrder" = 2
  WHERE "slug" = 'on_location_shoot';

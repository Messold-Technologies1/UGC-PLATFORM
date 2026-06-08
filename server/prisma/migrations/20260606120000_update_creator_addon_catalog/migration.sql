-- Rename on-location add-on and add Raw File Usage to the catalog.

UPDATE "CreatorAddOnOption"
SET
  "name" = 'On-location Shoot (25 km)',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'on_location_shoot';

UPDATE "CreatorAddOn"
SET
  "name" = 'On-location Shoot (25 km)',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" = 'On-location Shoot';

INSERT INTO "CreatorAddOnOption" (
  "id",
  "slug",
  "name",
  "sortOrder",
  "fixedPrice",
  "minPrice",
  "stepPrice",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  'raw_file_usage',
  'Raw File Usage',
  5,
  NULL,
  100,
  100,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "CreatorAddOnOption" WHERE "slug" = 'raw_file_usage'
);

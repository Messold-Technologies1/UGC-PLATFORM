-- Backfill the "Other" catalog option for CREATOR_TYPE and APPEARANCE.
--
-- These were added to the facet seed, but seeds are not re-run on deploy, so
-- already-provisioned databases are missing the rows and the wizard shows no
-- "Other" chip for those two dimensions. Insert them idempotently here so every
-- environment gets them via `prisma migrate deploy`.
INSERT INTO "CreatorFacetOption" ("id", "dimension", "slug", "label", "sortOrder")
SELECT
  gen_random_uuid(),
  'CREATOR_TYPE'::"CreatorFacetDimension",
  'other',
  'Other',
  COALESCE(
    (SELECT MAX("sortOrder") + 1 FROM "CreatorFacetOption"
     WHERE "dimension" = 'CREATOR_TYPE'::"CreatorFacetDimension"),
    0
  )
WHERE NOT EXISTS (
  SELECT 1 FROM "CreatorFacetOption"
  WHERE "dimension" = 'CREATOR_TYPE'::"CreatorFacetDimension" AND "slug" = 'other'
);

INSERT INTO "CreatorFacetOption" ("id", "dimension", "slug", "label", "sortOrder")
SELECT
  gen_random_uuid(),
  'APPEARANCE'::"CreatorFacetDimension",
  'other',
  'Other',
  COALESCE(
    (SELECT MAX("sortOrder") + 1 FROM "CreatorFacetOption"
     WHERE "dimension" = 'APPEARANCE'::"CreatorFacetDimension"),
    0
  )
WHERE NOT EXISTS (
  SELECT 1 FROM "CreatorFacetOption"
  WHERE "dimension" = 'APPEARANCE'::"CreatorFacetDimension" AND "slug" = 'other'
);

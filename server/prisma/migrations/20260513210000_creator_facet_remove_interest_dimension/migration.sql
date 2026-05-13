-- Drop INTEREST facet catalog (generic topic rows) and profile selections using them.
DELETE FROM "CreatorProfileFacetSelection"
WHERE "optionId" IN (
  SELECT "id" FROM "CreatorFacetOption" WHERE "dimension"::text = 'INTEREST'
);

DELETE FROM "CreatorFacetOption" WHERE "dimension"::text = 'INTEREST';

-- Recreate enum without INTEREST (PostgreSQL cannot drop a single enum value in-place).
CREATE TYPE "CreatorFacetDimension_new" AS ENUM (
  'CONTENT_FORMAT',
  'APPEARANCE',
  'CONTENT_STYLE',
  'CAPABILITY',
  'LIFE_STYLE',
  'OCCUPATION',
  'CONTENT_CATEGORY',
  'CATEGORY_EXPERIENCE',
  'CAN_CREATE_WITH',
  'AI_CONTENT_PERMISSION',
  'LANGUAGE'
);

ALTER TABLE "CreatorFacetOption"
  ALTER COLUMN "dimension" TYPE "CreatorFacetDimension_new"
  USING ("dimension"::text::"CreatorFacetDimension_new");

DROP TYPE "CreatorFacetDimension";

ALTER TYPE "CreatorFacetDimension_new" RENAME TO "CreatorFacetDimension";

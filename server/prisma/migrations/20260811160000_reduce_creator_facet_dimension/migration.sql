-- Reduce CreatorFacetDimension to the five dimensions still in use:
-- CONTENT_CATEGORY, CREATOR_TYPE, OCCUPATION, APPEARANCE, LANGUAGE.
--
-- Postgres has no "ALTER TYPE ... DROP VALUE", so swap the enum: rename the old
-- type aside, create the trimmed type, retype the only column that uses it
-- (CreatorFacetOption.dimension — its unique constraint and index are rebuilt
-- automatically by the column retype), then drop the old type.
--
-- Safe because 20260811150000_prune_creator_facets already deleted every
-- CreatorFacetOption row whose dimension is not one of the kept values, so the
-- USING cast below never meets a retired value.
ALTER TYPE "CreatorFacetDimension" RENAME TO "CreatorFacetDimension_old";

CREATE TYPE "CreatorFacetDimension" AS ENUM (
  'CONTENT_CATEGORY',
  'CREATOR_TYPE',
  'OCCUPATION',
  'APPEARANCE',
  'LANGUAGE'
);

ALTER TABLE "CreatorFacetOption"
  ALTER COLUMN "dimension" TYPE "CreatorFacetDimension"
  USING ("dimension"::text::"CreatorFacetDimension");

DROP TYPE "CreatorFacetDimension_old";

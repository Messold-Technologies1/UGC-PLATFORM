-- Move CreatorPackage.basicEditing into deliverables JSON, then drop the column.
-- This supports clients treating "Basic editing" as a deliverable tag.

DO $$
BEGIN
  -- Backfill only when the legacy column exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'CreatorPackage'
      AND column_name = 'basicEditing'
  ) THEN
    UPDATE "CreatorPackage"
    SET "deliverables" =
      CASE
        WHEN jsonb_typeof("deliverables"::jsonb) = 'array'
          AND NOT ("deliverables"::jsonb @> '["Basic editing"]'::jsonb)
          THEN ("deliverables"::jsonb || '["Basic editing"]'::jsonb)
        WHEN jsonb_typeof("deliverables"::jsonb) = 'array'
          THEN "deliverables"::jsonb
        ELSE '["1 Video","Basic editing"]'::jsonb
      END
    WHERE "basicEditing" = true;
  END IF;
END $$;

ALTER TABLE "CreatorPackage" DROP COLUMN IF EXISTS "basicEditing";


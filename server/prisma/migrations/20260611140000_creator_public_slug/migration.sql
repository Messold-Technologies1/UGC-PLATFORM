-- Add nullable column first, backfill, then enforce NOT NULL + unique.
ALTER TABLE "CreatorProfile" ADD COLUMN "publicSlug" TEXT;

DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  candidate TEXT;
  attempt INT;
BEGIN
  FOR rec IN
    SELECT id, "displayName"
    FROM "CreatorProfile"
    ORDER BY "createdAt" ASC
  LOOP
    base_slug := LOWER(REGEXP_REPLACE(TRIM(rec."displayName"), '\s+', '', 'g'));
    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := 'creator';
    END IF;

    candidate := base_slug;
    IF EXISTS (
      SELECT 1 FROM "CreatorProfile"
      WHERE "publicSlug" = candidate AND id <> rec.id
    ) THEN
      attempt := 0;
      LOOP
        candidate := base_slug || '-' || (1000 + floor(random() * 9000))::int::text;
        EXIT WHEN NOT EXISTS (
          SELECT 1 FROM "CreatorProfile"
          WHERE "publicSlug" = candidate AND id <> rec.id
        );
        attempt := attempt + 1;
        IF attempt >= 50 THEN
          candidate := base_slug || '-' || substr(replace(rec.id::text, '-', ''), 1, 8);
          EXIT;
        END IF;
      END LOOP;
    END IF;

    UPDATE "CreatorProfile" SET "publicSlug" = candidate WHERE id = rec.id;
  END LOOP;
END $$;

ALTER TABLE "CreatorProfile" ALTER COLUMN "publicSlug" SET NOT NULL;

CREATE UNIQUE INDEX "CreatorProfile_publicSlug_key" ON "CreatorProfile"("publicSlug");

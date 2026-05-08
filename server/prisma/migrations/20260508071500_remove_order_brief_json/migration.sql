-- Remove legacy Order.brief JSON by backfilling into Brief + linking via Order.briefId

-- 1) Best-effort backfill for existing orders that still have legacy JSON.
--    We only attempt to map common keys; unknown/extra keys are intentionally dropped
--    since the new system is normalized and typed.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Order'
      AND column_name = 'brief'
  ) THEN
    WITH to_backfill AS (
      SELECT
        o."id" AS "orderId",
        o."brandId" AS "brandId",
        o."brief" AS "briefJson",
        COALESCE(o."briefSubmittedAt", o."updatedAt", o."createdAt") AS "ts"
      FROM "Order" o
      WHERE o."briefId" IS NULL
        AND o."brief" IS NOT NULL
        AND jsonb_typeof(o."brief") = 'object'
    ),
    created AS (
      INSERT INTO "Brief" (
        "id",
        "brandId",
        "brandName",
        "brandPronunciation",
        "brandPronunciationAudioKey",
        "brandPronunciationAudioUrl",
        "industry",
        "brandLogoKey",
        "brandLogoUrl",
        "productName",
        "productDescription",
        "productPageUrl",
        "shootLocationAddress",
        "referenceLinks",
        "finalNotes",
        "createdAt",
        "updatedAt"
      )
      SELECT
        b."orderId",
        b."brandId",
        b."briefJson" ->> 'brandName',
        b."briefJson" ->> 'brandPronunciation',
        COALESCE(
          b."briefJson" #>> '{brandPronunciationAudio,key}',
          b."briefJson" ->> 'brandPronunciationAudioKey'
        ),
        COALESCE(
          b."briefJson" #>> '{brandPronunciationAudio,url}',
          b."briefJson" ->> 'brandPronunciationAudioUrl'
        ),
        b."briefJson" ->> 'industry',
        COALESCE(
          b."briefJson" #>> '{brandLogo,key}',
          b."briefJson" ->> 'brandLogoKey'
        ),
        COALESCE(
          b."briefJson" #>> '{brandLogo,url}',
          b."briefJson" ->> 'brandLogoUrl'
        ),
        COALESCE(b."briefJson" ->> 'productName', b."briefJson" ->> 'product'),
        COALESCE(b."briefJson" ->> 'productDescription', b."briefJson" ->> 'productDesc'),
        COALESCE(b."briefJson" ->> 'productPageUrl', b."briefJson" ->> 'productUrl'),
        COALESCE(
          b."briefJson" ->> 'shootLocationAddress',
          b."briefJson" ->> 'shootLocation'
        ),
        CASE
          WHEN jsonb_typeof(b."briefJson" -> 'referenceLinks') = 'array'
            THEN (b."briefJson" -> 'referenceLinks')
          WHEN jsonb_typeof(b."briefJson" -> 'references') = 'array'
            THEN (b."briefJson" -> 'references')
          ELSE '[]'::jsonb
        END,
        COALESCE(b."briefJson" ->> 'finalNotes', b."briefJson" ->> 'notes'),
        b."ts",
        b."ts"
      FROM to_backfill b
      ON CONFLICT ("id") DO NOTHING
      RETURNING "id" AS "briefId"
    )
    UPDATE "Order" o
    SET "briefId" = o."id"
    WHERE o."briefId" IS NULL
      AND o."brief" IS NOT NULL
      AND jsonb_typeof(o."brief") = 'object';
  END IF;
END $$;

-- 2) Drop the legacy column.
ALTER TABLE "Order"
DROP COLUMN IF EXISTS "brief";


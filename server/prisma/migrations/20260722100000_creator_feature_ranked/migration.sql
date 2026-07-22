WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "creatorId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, id DESC
    ) AS row_num
  FROM "CreatorFeature"
)
DELETE FROM "CreatorFeature" cf
USING ranked r
WHERE cf.id = r.id
  AND r.row_num > 1;

DROP INDEX IF EXISTS "CreatorFeature_creatorId_isFeatured_idx";

ALTER TABLE "CreatorFeature"
  DROP COLUMN "isFeatured",
  ADD COLUMN "rank" INTEGER NOT NULL DEFAULT 1000000;

CREATE UNIQUE INDEX "CreatorFeature_creatorId_key"
  ON "CreatorFeature"("creatorId");

CREATE INDEX "CreatorFeature_rank_idx"
  ON "CreatorFeature"("rank");

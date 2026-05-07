-- CreatorPackage: add video length + basic editing, enforce single package per creator,
-- and set sensible defaults (deliveryDays fixed at 5, maxRevisions default 1).

ALTER TABLE "CreatorPackage"
ADD COLUMN "videoLengthSeconds" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN "basicEditing" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "CreatorPackage"
ALTER COLUMN "deliveryDays" SET DEFAULT 5;

ALTER TABLE "CreatorPackage"
ALTER COLUMN "maxRevisions" SET DEFAULT 1;

-- If any existing rows had maxRevisions=0, bump to 1 (new rule: cannot be 0)
UPDATE "CreatorPackage" SET "maxRevisions" = 1 WHERE "maxRevisions" < 1;

-- Dedupe: keep the latest package per creator (required for unique index)
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "creatorId"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS rn
  FROM "CreatorPackage"
)
DELETE FROM "CreatorPackage" p
USING ranked r
WHERE p."id" = r."id"
  AND r.rn > 1;

-- Enforce one package per creator (for now)
CREATE UNIQUE INDEX "CreatorPackage_creatorId_key" ON "CreatorPackage"("creatorId");


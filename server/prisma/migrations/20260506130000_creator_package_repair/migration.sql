-- Repair migration for environments with drift:
-- Ensures CreatorPackage matches current Prisma schema expectations.

-- 1) Ensure videoLengthSeconds exists + default
ALTER TABLE "CreatorPackage"
ADD COLUMN IF NOT EXISTS "videoLengthSeconds" INTEGER NOT NULL DEFAULT 60;

-- 2) Ensure deliveryDays default is fixed at 5
ALTER TABLE "CreatorPackage"
ALTER COLUMN "deliveryDays" SET DEFAULT 5;

-- 3) Ensure maxRevisions default is 1 and existing rows are >= 1
ALTER TABLE "CreatorPackage"
ALTER COLUMN "maxRevisions" SET DEFAULT 1;

UPDATE "CreatorPackage" SET "maxRevisions" = 1 WHERE "maxRevisions" < 1;

-- 4) Drop legacy basicEditing column if it exists (we store it inside deliverables JSON now)
ALTER TABLE "CreatorPackage" DROP COLUMN IF EXISTS "basicEditing";

-- 5) Enforce one package per creator:
--    Choose a keeper per creator (prefer packages referenced by orders),
--    repoint orders to keeper, then delete remaining duplicates.
WITH pkg_flags AS (
  SELECT
    p."id",
    p."creatorId",
    p."createdAt",
    EXISTS (
      SELECT 1 FROM "Order" o WHERE o."creatorPackageId" = p."id"
    ) AS "hasOrder"
  FROM "CreatorPackage" p
),
ranked AS (
  SELECT
    "id",
    "creatorId",
    ROW_NUMBER() OVER (
      PARTITION BY "creatorId"
      ORDER BY "hasOrder" DESC, "createdAt" DESC, "id" DESC
    ) AS rn,
    FIRST_VALUE("id") OVER (
      PARTITION BY "creatorId"
      ORDER BY "hasOrder" DESC, "createdAt" DESC, "id" DESC
    ) AS "keepId"
  FROM pkg_flags
),
repoint AS (
  UPDATE "Order" o
  SET "creatorPackageId" = r."keepId"
  FROM ranked r
  WHERE o."creatorPackageId" = r."id"
    AND r.rn > 1
  RETURNING o."id"
)
DELETE FROM "CreatorPackage" p
USING ranked r
WHERE p."id" = r."id"
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "CreatorPackage_creatorId_key"
ON "CreatorPackage"("creatorId");


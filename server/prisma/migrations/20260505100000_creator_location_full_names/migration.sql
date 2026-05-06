-- Single city field + human-readable country/state names (drop codes and duplicate cityName)

ALTER TABLE "CreatorProfile" ADD COLUMN "countryName" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN "stateName" TEXT;

UPDATE "CreatorProfile"
SET "city" = COALESCE(NULLIF(TRIM("cityName"), ''), "city")
WHERE "cityName" IS NOT NULL;

ALTER TABLE "CreatorProfile" DROP COLUMN "cityName";
ALTER TABLE "CreatorProfile" DROP COLUMN "countryIso2";
ALTER TABLE "CreatorProfile" DROP COLUMN "stateCode";

DROP INDEX IF EXISTS "CreatorProfile_cityName_idx";
DROP INDEX IF EXISTS "CreatorProfile_countryIso2_idx";

CREATE INDEX "CreatorProfile_countryName_idx" ON "CreatorProfile"("countryName");

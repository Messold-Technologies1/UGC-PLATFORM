-- City/State reference data for AI-search location resolution.
-- Standalone tables (no FK from CreatorProfile) so the feature stays removable.

CREATE TABLE IF NOT EXISTS "State" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "aliasesNormalized" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "City" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "stateId" UUID NOT NULL,
  "stateName" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "aliasesNormalized" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "State_countryCode_name_key"
  ON "State"("countryCode", "name");

CREATE INDEX IF NOT EXISTS "State_aliasesNormalized_idx"
  ON "State" USING GIN ("aliasesNormalized");

CREATE UNIQUE INDEX IF NOT EXISTS "City_countryCode_stateName_name_key"
  ON "City"("countryCode", "stateName", "name");

CREATE INDEX IF NOT EXISTS "City_name_idx"
  ON "City"("name");

CREATE INDEX IF NOT EXISTS "City_aliasesNormalized_idx"
  ON "City" USING GIN ("aliasesNormalized");

DO $$ BEGIN
  ALTER TABLE "City"
  ADD CONSTRAINT "City_stateId_fkey"
  FOREIGN KEY ("stateId") REFERENCES "State"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

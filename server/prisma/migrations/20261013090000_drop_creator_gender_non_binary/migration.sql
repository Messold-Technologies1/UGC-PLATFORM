-- Removes NON_BINARY from CreatorGender.
--
-- The value was offered in the creator profile form and in the brand's gender
-- filter; both drop it in the same change. Creators who had selected it are
-- moved to OTHER, which is the remaining option that does not assert a
-- different answer on their behalf — PREFER_NOT_TO_SAY would.
--
-- Postgres cannot drop a value from an enum, so the type is rebuilt: the
-- column is detached from it, the old type is renamed out of the way, the new
-- one is created, and the column is cast back. CreatorProfile.gender is the
-- only column of this type.
--
-- The UPDATE runs first, inside the same transaction as the cast, so no row
-- can still hold NON_BINARY when the value stops existing. It compares the
-- column as text rather than as the enum: comparing against a literal the
-- enum no longer carries is an error, and casting sidesteps that, which makes
-- the whole migration safe to run twice.

-- Move anyone who selected it before the value disappears.
UPDATE "CreatorProfile"
  SET "gender" = 'OTHER'
  WHERE "gender"::text = 'NON_BINARY';

-- Rebuild the enum without NON_BINARY.
ALTER TYPE "CreatorGender" RENAME TO "CreatorGender_old";

CREATE TYPE "CreatorGender" AS ENUM ('FEMALE', 'MALE', 'PREFER_NOT_TO_SAY', 'OTHER');

ALTER TABLE "CreatorProfile"
  ALTER COLUMN "gender" TYPE "CreatorGender"
  USING ("gender"::text::"CreatorGender");

DROP TYPE "CreatorGender_old";

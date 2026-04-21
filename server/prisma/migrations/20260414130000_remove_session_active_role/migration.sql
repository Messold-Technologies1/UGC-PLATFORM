DROP INDEX IF EXISTS "Session_userId_activeRoleId_idx";

ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_activeRoleId_fkey";
ALTER TABLE "Session" DROP COLUMN IF EXISTS "activeRoleId";

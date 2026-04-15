-- Drop session-scoped active workspace role.
-- This removes the `Session.activeRoleId` column and its FK/indexes.

-- Drop FK first (name from the original migration).
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_activeRoleId_fkey";

-- Drop index that referenced activeRoleId.
DROP INDEX IF EXISTS "Session_userId_activeRoleId_idx";

-- Drop column.
ALTER TABLE "Session" DROP COLUMN IF EXISTS "activeRoleId";


-- Record who last activated or deactivated an account, and when.
--
-- Deactivation only flips User.status — nothing is deleted — so unlike the
-- removal flow this replaced, the record can live on the row it describes
-- instead of needing a separate table that outlives it.
--
-- Holds the latest change only. A full history would need its own table.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "statusChangedById" UUID;

-- SET NULL rather than CASCADE: losing the acting admin must not erase the
-- fact that the status was changed.
ALTER TABLE "User"
  ADD CONSTRAINT "User_statusChangedById_fkey"
  FOREIGN KEY ("statusChangedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "User_statusChangedById_idx"
  ON "User"("statusChangedById");

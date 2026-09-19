-- "Resubmit your profile" reminder bookkeeping for withdrawn creators.
--
-- One nullable stamp per stage (~30min / 24h / 48h after withdrawnAt), mirroring
-- the signup completion-reminder columns on CreatorProfile. Reset to null on
-- each new withdraw so every withdraw starts a fresh reminder cycle. Additive
-- and nullable — safe, non-destructive.
ALTER TABLE "CreatorApproval"
  ADD COLUMN IF NOT EXISTS "resubmitReminder30mAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resubmitReminder24hAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resubmitReminder48hAt" TIMESTAMP(3);

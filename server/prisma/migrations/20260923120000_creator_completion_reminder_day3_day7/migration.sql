-- Profile-completion reminder drip moves from 30min / 24h / 48h to a four-email
-- sequence: 30min / 24h / day 3 / day 7.
--
-- The old 48h stamp becomes the day-3 stamp (RENAME, so existing rows keep
-- their value): a creator who already got the third email must not receive the
-- day-3 one again. The day-7 stamp is new and starts null for everyone, so
-- profiles still building inside the backstop window pick it up on schedule.
--
-- Rename + additive column only; no data is dropped. The rename is guarded so
-- re-running against an already-migrated database is a no-op.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'CreatorProfile'
      AND column_name = 'completionReminder48hAt'
  ) THEN
    ALTER TABLE "CreatorProfile"
      RENAME COLUMN "completionReminder48hAt" TO "completionReminder72hAt";
  END IF;
END $$;

ALTER TABLE "CreatorProfile"
  ADD COLUMN IF NOT EXISTS "completionReminder72hAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completionReminder168hAt" TIMESTAMP(3);

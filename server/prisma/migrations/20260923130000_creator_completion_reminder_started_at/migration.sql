-- The completion drip is now measured from its own clock rather than from
-- CreatorProfile.createdAt, so an existing building-profile creator can be
-- re-enrolled ("start the sequence from now") without rewriting their signup
-- date.
--
-- The column defaults to row creation time, which for a new signup IS the
-- registration time — new creators keep starting from registration with no
-- extra bookkeeping.
--
-- Existing rows are backfilled to their own createdAt, so this migration
-- changes nothing about who is due for which stage: today's behaviour is
-- preserved exactly. Re-enrolling the current building-profile creators is a
-- deliberate, separate step (prisma:reenroll:completion-reminders), never a
-- side effect of deploying.
ALTER TABLE "CreatorProfile"
  ADD COLUMN IF NOT EXISTS "completionReminderStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "CreatorProfile"
  SET "completionReminderStartedAt" = "createdAt"
  WHERE "completionReminderStartedAt" <> "createdAt";

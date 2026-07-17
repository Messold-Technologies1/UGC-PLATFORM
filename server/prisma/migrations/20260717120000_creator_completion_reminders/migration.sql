-- Profile-completion reminder timestamps. Each is stamped once when its
-- reminder is handled, keeping the reminder job idempotent. Nullable and
-- additive so the feature stays removable (drop these columns to remove it).
ALTER TABLE "CreatorProfile" ADD COLUMN "completionReminder30mAt" TIMESTAMP(3);
ALTER TABLE "CreatorProfile" ADD COLUMN "completionReminder24hAt" TIMESTAMP(3);
ALTER TABLE "CreatorProfile" ADD COLUMN "completionReminder48hAt" TIMESTAMP(3);

-- Serves the completion-reminder poll: WHERE completeProfile = false AND createdAt in window.
CREATE INDEX "CreatorProfile_completeProfile_createdAt_idx" ON "CreatorProfile"("completeProfile", "createdAt");

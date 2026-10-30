-- Per-event browser-notification copy.
--
-- Push has been rendering from the email template since the channel landed:
-- the subject becomes the title, the opening line of the text part becomes the
-- body. That is what let every event switch on without authoring anything, and
-- it is a floor rather than a ceiling — an email subject is written for an
-- inbox, where naming the sender is the convention and there is room for a
-- sentence, while a notification has about forty characters of title before a
-- lock screen truncates it.
--
-- Both columns are nullable and both keep falling back when null, so nothing
-- changes for an event nobody has written push copy for.
--
-- The version table gets them too. Without that, reverting a template would
-- restore the email and silently leave the notification copy from a later
-- edit — two halves of a message from different authors.

-- AlterTable
ALTER TABLE "NotificationTemplate" ADD COLUMN     "pushTitleHbs" TEXT;
ALTER TABLE "NotificationTemplate" ADD COLUMN     "pushBodyHbs" TEXT;

-- AlterTable
ALTER TABLE "NotificationTemplateVersion" ADD COLUMN     "pushTitleHbs" TEXT;
ALTER TABLE "NotificationTemplateVersion" ADD COLUMN     "pushBodyHbs" TEXT;

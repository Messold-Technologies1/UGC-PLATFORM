-- AlterTable
-- Null for every existing row: those bodies were hand-written as HTML and keep
-- being edited that way. A row gets a document the first time it is saved from
-- the visual editor, and htmlHbs is rendered from it thereafter.
ALTER TABLE "NotificationTemplate" ADD COLUMN     "bodyDoc" JSONB;

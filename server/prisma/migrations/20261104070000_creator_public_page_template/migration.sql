-- Creator-selectable public page template.
-- Stored as text rather than an enum so new templates ship without a migration;
-- the client registry resolves unknown values to the default template.
ALTER TABLE "CreatorProfile"
  ADD COLUMN "publicPageTemplate" TEXT NOT NULL DEFAULT 'v3';

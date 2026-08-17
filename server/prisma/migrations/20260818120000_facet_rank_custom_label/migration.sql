-- Primary/secondary niche + free-text "Other" support on facet selections.
--
-- rank: only meaningful for CONTENT_CATEGORY (niche) — 0 = primary,
--   1..2 = secondary. Existing rows default to 0; the app treats the first
--   niche as primary on read until the creator re-saves the step.
-- customLabel: free text when the selected option is the catalog "other" slug.
ALTER TABLE "CreatorProfileFacetSelection"
  ADD COLUMN "rank" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "customLabel" TEXT;

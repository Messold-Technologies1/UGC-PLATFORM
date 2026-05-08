-- Remove pronunciation text fields (audio-only)

ALTER TABLE "BrandProfile"
DROP COLUMN IF EXISTS "brandPronunciation";

ALTER TABLE "Brief"
DROP COLUMN IF EXISTS "brandPronunciation";


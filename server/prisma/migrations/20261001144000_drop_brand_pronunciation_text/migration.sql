-- Audio-only pronunciation: drop the phonetic-text column if it was added.
ALTER TABLE "BrandProfile"
DROP COLUMN IF EXISTS "brandPronunciation";

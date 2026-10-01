-- Restore phonetic brand-name spelling (the settings form still collects it;
-- audio remains a separate field).
ALTER TABLE "BrandProfile"
ADD COLUMN IF NOT EXISTS "brandPronunciation" TEXT;

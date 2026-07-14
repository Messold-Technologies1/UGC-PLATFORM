-- Fix misspelled industry "Lifestyle Fittness" → "Lifestyle Fitness"
-- and remove junk single-letter suggestion "M".

-- Remap videos that used the misspelling.
UPDATE "CreatorPortfolioVideo"
SET "industryLabel" = 'Lifestyle Fitness'
WHERE lower(btrim("industryLabel")) = 'lifestyle fittness';

-- If the correct suggestion already exists, drop the misspelled duplicate.
DELETE FROM "PortfolioIndustrySuggestion"
WHERE "normalizedName" = 'lifestyle fittness'
  AND EXISTS (
    SELECT 1
    FROM "PortfolioIndustrySuggestion"
    WHERE "normalizedName" = 'lifestyle fitness'
  );

-- Otherwise rename the misspelled suggestion in place.
UPDATE "PortfolioIndustrySuggestion"
SET
  name = 'Lifestyle Fitness',
  "normalizedName" = 'lifestyle fitness'
WHERE "normalizedName" = 'lifestyle fittness';

-- Clear junk "M" labels on videos, then remove the suggestion.
UPDATE "CreatorPortfolioVideo"
SET "industryLabel" = NULL
WHERE btrim("industryLabel") IN ('M', 'm');

DELETE FROM "PortfolioIndustrySuggestion"
WHERE "normalizedName" = 'm'
   OR btrim(name) = 'M';

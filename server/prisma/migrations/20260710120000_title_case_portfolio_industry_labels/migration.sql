-- Title-case portfolio industry suggestion display names.
UPDATE "PortfolioIndustrySuggestion"
SET name = initcap(name);

-- Align existing video industry labels to the canonical suggestion casing
-- when they match a known suggestion (case-insensitive). Leaves free-text
-- labels that are not in the suggestion table unchanged (e.g. D2C, SaaS).
UPDATE "CreatorPortfolioVideo" AS v
SET "industryLabel" = s.name
FROM "PortfolioIndustrySuggestion" AS s
WHERE v."industryLabel" IS NOT NULL
  AND lower(btrim(v."industryLabel")) = s."normalizedName";

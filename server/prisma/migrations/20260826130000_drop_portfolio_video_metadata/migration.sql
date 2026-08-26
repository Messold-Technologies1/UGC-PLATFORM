-- Portfolio videos no longer carry metadata. A portfolio video is a video:
-- no industry label, no language, no description, and no free-text tags. The
-- creator-facing inputs for all of these are removed in the same change.
--
-- DESTRUCTIVE. Everything below drops data that cannot be recovered from the
-- application, so take a snapshot before deploying.
--
-- Discovery impact: buildCreatorListSearchWhere() matched a brand's free-text
-- search against portfolio industryLabel and tags. Those clauses go with the
-- columns. Keyword search still matches city, state, country, bio, niche and
-- category facet labels (including custom "Other" text), package names and
-- open-to restrictions — niche and category being the strong signal, and those
-- live on facetSelections, not here.

-- 1. The tag join table. Dropped outright rather than emptied: no code reads it
--    after this change.
DROP TABLE IF EXISTS "CreatorPortfolioVideoTag";

-- 2. The autocomplete catalogues that fed the removed inputs. They were only
--    ever written by portfolio create/update and read by the three suggestion
--    endpoints, all of which are gone.
DROP TABLE IF EXISTS "PortfolioIndustrySuggestion";
DROP TABLE IF EXISTS "PortfolioTagSuggestion";
DROP TABLE IF EXISTS "PortfolioLanguageSuggestion";

-- 3. The index existed to serve industry-filtered public queries. Its only
--    caller was the search clause being removed.
DROP INDEX IF EXISTS "CreatorPortfolioVideo_visibilityStatus_industryLabel_idx";

-- 4. The columns themselves. visibilityStatus is deliberately NOT dropped: it
--    still gates the go-live count, the public-profile filters, the browse
--    filter and wishlists. Only its creator-facing control goes away, and new
--    videos are created PUBLIC.
ALTER TABLE "CreatorPortfolioVideo"
  DROP COLUMN IF EXISTS "industryLabel",
  DROP COLUMN IF EXISTS "language",
  DROP COLUMN IF EXISTS "description";

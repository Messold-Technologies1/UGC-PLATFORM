-- Clean up existing creators' "Open to" (CreatorRestriction) rows so they hold
-- only the five current canonical labels. The facet prune never touched this
-- table, so creators still carry old/opt-out restriction values that show a
-- phantom count in the editor and re-save on the next profile update.

-- 1. Remap known legacy labels to their canonical equivalent, but skip rows
--    where the creator already has the canonical label (the @@unique(creatorId,
--    restriction) would otherwise be violated — those legacy rows are removed in
--    step 2 instead).
UPDATE "CreatorRestriction" cr
SET "restriction" = m.canonical
FROM (VALUES
  ('accepts intimate wear / lingerie', 'Lingerie'),
  ('intimate wear / lingerie', 'Lingerie'),
  ('accepts gambling', 'Gambling / Betting'),
  ('gambling', 'Gambling / Betting')
) AS m(legacy, canonical)
WHERE cr."restriction" = m.legacy
  AND NOT EXISTS (
    SELECT 1
    FROM "CreatorRestriction" existing
    WHERE existing."creatorId" = cr."creatorId"
      AND existing."restriction" = m.canonical
  );

-- 2. Drop everything that is not one of the five current "Open to" labels
--    (stale catalogs, opt-out rows, and legacy rows that collided in step 1).
DELETE FROM "CreatorRestriction"
WHERE "restriction" NOT IN (
  'Gambling / Betting',
  'Lingerie',
  'Intimacy / Adult',
  'Dating / Dating Apps',
  'Night Clubs'
);

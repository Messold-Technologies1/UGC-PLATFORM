-- One-off: refresh creator content-preference suggestions (Open to catalog).
-- Safe to re-run. Run: npx prisma db execute --file prisma/backfill-creator-restriction-suggestions.sql

-- Migrate legacy "accepts …" creator rows to short labels.
UPDATE "CreatorRestriction" SET restriction = 'swimwear / beachwear'
WHERE LOWER(restriction) = 'accepts swimwear / beachwear'
  AND NOT EXISTS (
    SELECT 1 FROM "CreatorRestriction" cr
    WHERE cr."creatorId" = "CreatorRestriction"."creatorId"
      AND LOWER(cr.restriction) = 'swimwear / beachwear'
      AND cr.id <> "CreatorRestriction".id
  );

UPDATE "CreatorRestriction" SET restriction = 'intimate wear / lingerie'
WHERE LOWER(restriction) = 'accepts intimate wear / lingerie'
  AND NOT EXISTS (
    SELECT 1 FROM "CreatorRestriction" cr
    WHERE cr."creatorId" = "CreatorRestriction"."creatorId"
      AND LOWER(cr.restriction) = 'intimate wear / lingerie'
      AND cr.id <> "CreatorRestriction".id
  );

UPDATE "CreatorRestriction" SET restriction = 'alcohol'
WHERE LOWER(restriction) = 'accepts alcohol'
  AND NOT EXISTS (
    SELECT 1 FROM "CreatorRestriction" cr
    WHERE cr."creatorId" = "CreatorRestriction"."creatorId"
      AND LOWER(cr.restriction) = 'alcohol'
      AND cr.id <> "CreatorRestriction".id
  );

UPDATE "CreatorRestriction" SET restriction = 'gambling'
WHERE LOWER(restriction) = 'accepts gambling'
  AND NOT EXISTS (
    SELECT 1 FROM "CreatorRestriction" cr
    WHERE cr."creatorId" = "CreatorRestriction"."creatorId"
      AND LOWER(cr.restriction) = 'gambling'
      AND cr.id <> "CreatorRestriction".id
  );

-- Drop duplicate legacy rows after migration.
DELETE FROM "CreatorRestriction"
WHERE LOWER(restriction) IN (
  'accepts swimwear / beachwear',
  'accepts intimate wear / lingerie',
  'accepts alcohol',
  'accepts gambling',
  'does not accept lingerie',
  'does not accept alcohol',
  'does not accept gambling',
  'accept alcohol',
  'accept gambling'
)
OR LOWER(restriction) LIKE 'does not accept%';

DELETE FROM "CreatorRestrictionSuggestion"
WHERE LOWER("normalizedName") IN (
  'does not accept lingerie',
  'does not accept alcohol',
  'does not accept gambling',
  'accept alcohol',
  'accept gambling',
  'accepts swimwear / beachwear',
  'accepts intimate wear / lingerie',
  'accepts alcohol',
  'accepts gambling'
)
OR LOWER(name) LIKE 'does not accept%'
OR LOWER(name) LIKE 'accepts %';

INSERT INTO "CreatorRestrictionSuggestion" (id, name, "normalizedName")
VALUES
  (gen_random_uuid(), 'swimwear / beachwear', 'swimwear / beachwear'),
  (gen_random_uuid(), 'intimate wear / lingerie', 'intimate wear / lingerie'),
  (gen_random_uuid(), 'alcohol', 'alcohol'),
  (gen_random_uuid(), 'gambling', 'gambling')
ON CONFLICT ("normalizedName") DO UPDATE SET name = EXCLUDED.name;

-- Catalog: content categories (vertical niches).
INSERT INTO "CreatorFacetOption" ("id", "dimension", "slug", "label", "sortOrder", "createdAt")
VALUES
  (gen_random_uuid(), 'CONTENT_CATEGORY', 'fashion', 'Fashion', 0, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CONTENT_CATEGORY', 'beauty_skincare', 'Beauty / Skincare', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CONTENT_CATEGORY', 'fitness_gym', 'Fitness / Gym', 2, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CONTENT_CATEGORY', 'food_cooking', 'Food / Cooking', 3, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CONTENT_CATEGORY', 'travel', 'Travel', 4, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CONTENT_CATEGORY', 'technology_gadgets', 'Technology / Gadgets', 5, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CONTENT_CATEGORY', 'home_lifestyle', 'Home / Lifestyle', 6, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CONTENT_CATEGORY', 'health_wellness', 'Health / Wellness', 7, CURRENT_TIMESTAMP)
ON CONFLICT ("dimension", "slug") DO NOTHING;

-- Move profile selections from legacy INTEREST vertical rows to CONTENT_CATEGORY (same slug).
UPDATE "CreatorProfileFacetSelection" AS cps
SET "optionId" = new_o."id"
FROM "CreatorFacetOption" AS old_o
INNER JOIN "CreatorFacetOption" AS new_o
  ON new_o."dimension" = 'CONTENT_CATEGORY' AND new_o."slug" = old_o."slug"
WHERE cps."optionId" = old_o."id"
  AND old_o."dimension" = 'INTEREST'
  AND old_o."slug" IN (
    'fashion',
    'beauty_skincare',
    'fitness_gym',
    'food_cooking',
    'travel',
    'technology_gadgets',
    'home_lifestyle'
  );

DELETE FROM "CreatorFacetOption"
WHERE "dimension" = 'INTEREST'
  AND "slug" IN (
    'fashion',
    'beauty_skincare',
    'fitness_gym',
    'food_cooking',
    'travel',
    'technology_gadgets',
    'home_lifestyle'
  );

-- Broader "interest" topics (distinct from content verticals).
INSERT INTO "CreatorFacetOption" ("id", "dimension", "slug", "label", "sortOrder", "createdAt")
VALUES
  (gen_random_uuid(), 'INTEREST', 'music_entertainment', 'Music & entertainment', 0, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'INTEREST', 'sports_outdoors', 'Sports & outdoors', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'INTEREST', 'gaming', 'Gaming', 2, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'INTEREST', 'books_learning', 'Books & learning', 3, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'INTEREST', 'art_design', 'Art & design', 4, CURRENT_TIMESTAMP)
ON CONFLICT ("dimension", "slug") DO NOTHING;

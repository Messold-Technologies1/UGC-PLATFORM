-- Slim the facet catalog down to: Creator's Category, Creator Type, Occupation,
-- Appearance (+ Language). Every other dimension is retired.
--
-- Deleting the CreatorFacetOption rows cascades to CreatorProfileFacetSelection
-- (onDelete: Cascade), so existing creators' selections in the retired/replaced
-- dimensions are cleaned up automatically. Language options are kept intact.
--
-- The kept dimensions' fresh option lists are (re)inserted by the seed
-- (creator-facet-seed.ts) — run `prisma:seed` after this migration.
DELETE FROM "CreatorFacetOption"
WHERE "dimension" <> 'LANGUAGE';

-- Add Script Writing as a default creator add-on catalog option.
-- Later removed by 20260513100000_remove_script_writing_addon.

INSERT INTO "CreatorAddOnOption" ("id", "slug", "name", "sortOrder", "fixedPrice", "minPrice", "stepPrice", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'script_writing',
  'Script Writing',
  100,
  NULL,
  NULL,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

-- Runs in a separate transaction after the enum value exists.
INSERT INTO "CreatorFacetOption" ("id", "dimension", "slug", "label", "sortOrder", "createdAt")
VALUES
  (gen_random_uuid(), 'AI_CONTENT_PERMISSION', 'ai_subtitles', 'AI subtitles', 0, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'AI_CONTENT_PERMISSION', 'ai_voice_cleanup', 'AI voice cleanup', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'AI_CONTENT_PERMISSION', 'ai_script_hook_variations', 'AI script/hook variations', 2, CURRENT_TIMESTAMP)
ON CONFLICT ("dimension", "slug") DO NOTHING;

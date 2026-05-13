-- Remove Script Writing from creator add-on catalog and profiles.
DELETE FROM "CreatorAddOn" WHERE "name" = 'Script Writing';

DELETE FROM "CreatorAddOnOption" WHERE "slug" = 'script_writing';

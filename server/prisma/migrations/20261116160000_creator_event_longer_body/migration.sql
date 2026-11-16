-- Raise the event post limit from 500 to 1000 characters.
--
-- Widening a VARCHAR is a metadata-only change in Postgres: no table rewrite,
-- no lock held beyond the catalogue update, and every existing row stays
-- valid. Narrowing it again would not be free, which is the reason to pick a
-- limit with some room rather than creep up in small steps.
--
-- CREATOR_EVENT_MAX_LENGTH in creator-events.constants.ts has to match. The
-- DTO rejects at the constant with a message the creator can act on; this
-- column is the backstop that rejects with a database error nobody can read.
ALTER TABLE "CreatorEvent"
  ALTER COLUMN "body" TYPE VARCHAR(1000);

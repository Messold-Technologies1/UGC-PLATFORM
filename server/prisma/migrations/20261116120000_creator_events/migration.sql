-- Creator Events: short free-text status posts ("travelling to Jaipur this
-- week", "off sick until Monday") that brands read as one chronological feed.
--
-- Text only, by design: no media, no date range, no reactions. The post
-- carries no availability meaning either -- CreatorUnavailability stays the
-- one explicit place bookable dates are set, so writing "taking a break" here
-- never silently stops a creator's orders.
--
-- Two kinds of removal, kept apart on purpose:
--   deletedAt  -- the creator removed their own post
--   hiddenAt   -- an admin moderated it; the creator still sees it with a
--                 Hidden banner, and the row survives as the record of why.
-- Neither is a hard delete.
CREATE TABLE "CreatorEvent" (
  "id"             UUID         NOT NULL,
  "creatorId"      UUID         NOT NULL,
  "body"           VARCHAR(500) NOT NULL,
  "editedAt"       TIMESTAMP(3),
  "hiddenAt"       TIMESTAMP(3),
  "hiddenByUserId" UUID,
  "hiddenReason"   VARCHAR(200),
  "deletedAt"      TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CreatorEvent_pkey" PRIMARY KEY ("id")
);

-- The creator's own list, newest first.
CREATE INDEX "CreatorEvent_creatorId_createdAt_idx"
  ON "CreatorEvent" ("creatorId", "createdAt" DESC);

-- The brand feed's keyset page: ORDER BY "createdAt" DESC, "id" DESC.
CREATE INDEX "CreatorEvent_createdAt_id_idx"
  ON "CreatorEvent" ("createdAt" DESC, "id" DESC);

CREATE INDEX "CreatorEvent_hiddenByUserId_idx"
  ON "CreatorEvent" ("hiddenByUserId");

ALTER TABLE "CreatorEvent"
  ADD CONSTRAINT "CreatorEvent_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- SET NULL, not CASCADE: deleting an admin account must not delete the posts
-- they moderated.
ALTER TABLE "CreatorEvent"
  ADD CONSTRAINT "CreatorEvent_hiddenByUserId_fkey"
  FOREIGN KEY ("hiddenByUserId") REFERENCES "User" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

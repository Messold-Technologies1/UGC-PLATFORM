-- Add maxRevisions to creator packages
ALTER TABLE "CreatorPackage"
ADD COLUMN "maxRevisions" INTEGER NOT NULL DEFAULT 0;


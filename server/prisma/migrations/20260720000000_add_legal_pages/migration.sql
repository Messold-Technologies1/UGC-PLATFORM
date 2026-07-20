-- Adds the LegalPage / LegalPageVersion tables and the LegalDraftStatus enum.
--
-- These models exist in schema.prisma but were never created by a migration
-- (earlier environments got them via `prisma db push`), so a clean
-- `migrate deploy` reports "up to date" while the tables are missing. This
-- migration closes that gap. It is written idempotently (IF NOT EXISTS /
-- guarded enum + FK) so it is safe to apply both to databases that already
-- have the tables and to those that do not.

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LegalDraftStatus') THEN
    CREATE TYPE "LegalDraftStatus" AS ENUM ('DRAFT', 'IN_REVIEW');
  END IF;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "LegalPage" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "effectiveDate" TEXT NOT NULL,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,
    "draftStatus" "LegalDraftStatus",
    "draftTitle" TEXT,
    "draftDescription" TEXT,
    "draftEffectiveDate" TEXT,
    "draftSections" JSONB,
    "draftChangeNote" TEXT,
    "draftCreatedBy" UUID,
    "draftReviewNote" TEXT,
    "draftCreatedAt" TIMESTAMP(3),
    "draftUpdatedAt" TIMESTAMP(3),
    "draftRestoredFromVersionId" UUID,

    CONSTRAINT "LegalPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LegalPageVersion" (
    "id" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedBy" UUID NOT NULL,
    "changeNote" TEXT,
    "restoredFromVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalPageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LegalPage_slug_key" ON "LegalPage"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegalPage_slug_idx" ON "LegalPage"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegalPageVersion_pageId_createdAt_idx" ON "LegalPageVersion"("pageId", "createdAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LegalPageVersion_pageId_fkey'
  ) THEN
    ALTER TABLE "LegalPageVersion"
      ADD CONSTRAINT "LegalPageVersion_pageId_fkey"
      FOREIGN KEY ("pageId") REFERENCES "LegalPage"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AI "Other" resolver: creator-proposed catalog options + a learned synonym cache.
--
-- status: only "active" options appear in the pick lists. Existing rows default
--   to active. "rejected" soft-hides an option without breaking selections.
-- proposedByCreatorId: audit trail for options a creator added via "Other".
ALTER TABLE "CreatorFacetOption"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "proposedByCreatorId" UUID;

CREATE INDEX "CreatorFacetOption_dimension_status_idx"
  ON "CreatorFacetOption" ("dimension", "status");

-- Normalized free-text -> canonical option, so repeat "Other" entries resolve
-- with no AI call.
CREATE TABLE "CreatorFacetOptionAlias" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "dimension"      "CreatorFacetDimension" NOT NULL,
  "normalizedText" TEXT NOT NULL,
  "optionId"       UUID NOT NULL,
  "source"         TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreatorFacetOptionAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatorFacetOptionAlias_dimension_normalizedText_key"
  ON "CreatorFacetOptionAlias" ("dimension", "normalizedText");
CREATE INDEX "CreatorFacetOptionAlias_optionId_idx"
  ON "CreatorFacetOptionAlias" ("optionId");

ALTER TABLE "CreatorFacetOptionAlias"
  ADD CONSTRAINT "CreatorFacetOptionAlias_optionId_fkey"
  FOREIGN KEY ("optionId") REFERENCES "CreatorFacetOption"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

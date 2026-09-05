-- Track who shortlisted vs who sent a profile for review, separately from
-- approvedById (which is overwritten by every admin action today).
ALTER TABLE "CreatorApproval" ADD COLUMN "shortlistedById" UUID;
ALTER TABLE "CreatorApproval" ADD COLUMN "sentForReviewById" UUID;

CREATE INDEX "CreatorApproval_shortlistedById_idx" ON "CreatorApproval"("shortlistedById");
CREATE INDEX "CreatorApproval_sentForReviewById_idx" ON "CreatorApproval"("sentForReviewById");

ALTER TABLE "CreatorApproval"
  ADD CONSTRAINT "CreatorApproval_shortlistedById_fkey"
  FOREIGN KEY ("shortlistedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CreatorApproval"
  ADD CONSTRAINT "CreatorApproval_sentForReviewById_fkey"
  FOREIGN KEY ("sentForReviewById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Best-effort backfill from the last admin who touched the row.
UPDATE "CreatorApproval"
SET "shortlistedById" = "approvedById"
WHERE "wasShortlisted" = true
  AND "approvedById" IS NOT NULL;

UPDATE "CreatorApproval"
SET "sentForReviewById" = "approvedById"
WHERE "status" = 'PENDING'
  AND "wasShortlisted" = false
  AND "approvedById" IS NOT NULL;

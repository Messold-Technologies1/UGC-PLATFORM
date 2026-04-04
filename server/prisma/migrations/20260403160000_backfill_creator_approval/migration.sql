-- Backfill CreatorApproval for profiles created before the approval workflow
INSERT INTO "CreatorApproval" ("id", "creatorId", "status", "approvedById", "approvedAt", "rejectionReason", "createdAt", "updatedAt")
SELECT gen_random_uuid(), cp."id", 'PENDING'::"ApprovalStatus", NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "CreatorProfile" cp
WHERE NOT EXISTS (
  SELECT 1 FROM "CreatorApproval" ca WHERE ca."creatorId" = cp."id"
);

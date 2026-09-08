-- AlterTable: record when the creator accepted the Go-Live policies (AI Content,
-- Usage Rights, Payout, Creator Guidelines). Additive and nullable — null means
-- the creator has not accepted them. Safe, non-destructive migration.
ALTER TABLE "CreatorProfile" ADD COLUMN "goLivePoliciesAcceptedAt" TIMESTAMP(3);

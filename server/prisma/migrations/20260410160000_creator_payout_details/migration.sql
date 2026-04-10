-- Manual payout details for creators (admin-visible full values; creators see masked via API)
CREATE TABLE "CreatorPayoutDetails" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creatorId" UUID NOT NULL,
    "accountHolderName" TEXT,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "upiId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorPayoutDetails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatorPayoutDetails_creatorId_key" ON "CreatorPayoutDetails"("creatorId");

CREATE INDEX "CreatorPayoutDetails_creatorId_idx" ON "CreatorPayoutDetails"("creatorId");

ALTER TABLE "CreatorPayoutDetails" ADD CONSTRAINT "CreatorPayoutDetails_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

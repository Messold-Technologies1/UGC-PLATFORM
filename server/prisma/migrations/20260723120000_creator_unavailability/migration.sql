-- CreateTable
CREATE TABLE "CreatorUnavailability" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorUnavailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorUnavailability_creatorId_key" ON "CreatorUnavailability"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorUnavailability_startsOn_endsOn_idx" ON "CreatorUnavailability"("startsOn", "endsOn");

-- AddForeignKey
ALTER TABLE "CreatorUnavailability" ADD CONSTRAINT "CreatorUnavailability_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

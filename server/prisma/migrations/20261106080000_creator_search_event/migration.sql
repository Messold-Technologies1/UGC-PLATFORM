-- CreateTable
CREATE TABLE "CreatorSearchEvent" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" UUID,
    "brandProfileId" UUID,
    "audience" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "filterKeys" TEXT[],
    "resultCount" INTEGER NOT NULL,

    CONSTRAINT "CreatorSearchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreatorSearchEvent_createdAt_idx" ON "CreatorSearchEvent"("createdAt");

-- CreateIndex
CREATE INDEX "CreatorSearchEvent_brandProfileId_createdAt_idx" ON "CreatorSearchEvent"("brandProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "CreatorSearchEvent_audience_createdAt_idx" ON "CreatorSearchEvent"("audience", "createdAt");

-- Creator portfolio sections: named groups of portfolio videos with ordering.

CREATE TABLE "CreatorPortfolioSection" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorPortfolioSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreatorPortfolioSectionVideo" (
    "sectionId" UUID NOT NULL,
    "videoId" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CreatorPortfolioSectionVideo_pkey" PRIMARY KEY ("sectionId", "videoId")
);

CREATE INDEX "CreatorPortfolioSection_creatorId_position_idx"
    ON "CreatorPortfolioSection"("creatorId", "position");

CREATE INDEX "CreatorPortfolioSectionVideo_sectionId_position_idx"
    ON "CreatorPortfolioSectionVideo"("sectionId", "position");

ALTER TABLE "CreatorPortfolioSection"
    ADD CONSTRAINT "CreatorPortfolioSection_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorPortfolioSectionVideo"
    ADD CONSTRAINT "CreatorPortfolioSectionVideo_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "CreatorPortfolioSection"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorPortfolioSectionVideo"
    ADD CONSTRAINT "CreatorPortfolioSectionVideo_videoId_fkey"
    FOREIGN KEY ("videoId") REFERENCES "CreatorPortfolioVideo"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

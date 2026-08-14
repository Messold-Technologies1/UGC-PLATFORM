-- CreateTable
CREATE TABLE "CreatorDemoVideo" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "videoKey" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "thumbnailKey" TEXT,
    "thumbnailUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorDemoVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreatorDemoVideo_active_sortOrder_idx" ON "CreatorDemoVideo"("active", "sortOrder");

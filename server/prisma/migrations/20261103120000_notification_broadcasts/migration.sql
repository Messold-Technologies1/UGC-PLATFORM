-- CreateEnum
CREATE TYPE "BroadcastAudience" AS ENUM ('CREATORS_WITH_OPEN_TO', 'LISTED_CREATORS', 'ACTIVE_BRANDS', 'ACTIVE_AGENCIES');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('PENDING', 'SENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "NotificationBroadcast" (
    "id" UUID NOT NULL,
    "audience" "BroadcastAudience" NOT NULL,
    "note" TEXT,
    "emailTemplateId" UUID,
    "whatsappTemplateName" TEXT,
    "channels" "NotificationChannel"[],
    "status" "BroadcastStatus" NOT NULL DEFAULT 'PENDING',
    "matched" INTEGER NOT NULL DEFAULT 0,
    "enqueued" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "NotificationBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationBroadcast_createdAt_idx" ON "NotificationBroadcast"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "NotificationBroadcast_audience_createdAt_idx" ON "NotificationBroadcast"("audience", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "NotificationBroadcast" ADD CONSTRAINT "NotificationBroadcast_emailTemplateId_fkey" FOREIGN KEY ("emailTemplateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;


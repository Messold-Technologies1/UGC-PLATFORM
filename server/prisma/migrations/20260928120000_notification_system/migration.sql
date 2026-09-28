-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationRecipientRole" AS ENUM ('CREATOR', 'BRAND', 'USER');

-- CreateEnum
CREATE TYPE "NotificationLogStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED', 'BOUNCED', 'COMPLAINED');

-- CreateTable
CREATE TABLE "NotificationEvent" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "recipient" "NotificationRecipientRole" NOT NULL,
    "vars" JSONB NOT NULL DEFAULT '{}',
    "alwaysSend" BOOLEAN NOT NULL DEFAULT false,
    "supportsDelay" BOOLEAN NOT NULL DEFAULT false,
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailTemplateId" UUID,
    "whatsappTemplateName" TEXT,

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "NotificationSchedule" (
    "id" UUID NOT NULL,
    "eventKey" TEXT NOT NULL,
    "offsetMinutes" INTEGER NOT NULL,
    "channels" "NotificationChannel"[],
    "templateOverrideId" UUID,
    "whatsappTemplateOverride" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NotificationSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subjectHbs" TEXT NOT NULL,
    "htmlHbs" TEXT NOT NULL,
    "textHbs" TEXT,
    "referencedVars" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplateVersion" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "subjectHbs" TEXT NOT NULL,
    "htmlHbs" TEXT NOT NULL,
    "textHbs" TEXT,
    "note" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" UUID NOT NULL,
    "eventKey" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "occurrenceKey" TEXT NOT NULL,
    "offsetMinutes" INTEGER NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationLogStatus" NOT NULL DEFAULT 'QUEUED',
    "recipientUserId" UUID,
    "recipientProfileType" TEXT,
    "recipientProfileId" UUID,
    "toAddress" TEXT NOT NULL,
    "templateId" UUID,
    "renderedSubject" TEXT,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "skippedReason" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationEvent_isActive_deprecated_idx" ON "NotificationEvent"("isActive", "deprecated");

-- CreateIndex
CREATE INDEX "NotificationSchedule_eventKey_isActive_idx" ON "NotificationSchedule"("eventKey", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSchedule_eventKey_offsetMinutes_key" ON "NotificationSchedule"("eventKey", "offsetMinutes");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_name_key" ON "NotificationTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplateVersion_templateId_version_key" ON "NotificationTemplateVersion"("templateId", "version");

-- CreateIndex
CREATE INDEX "NotificationLog_providerMessageId_idx" ON "NotificationLog"("providerMessageId");

-- CreateIndex
CREATE INDEX "NotificationLog_recipientUserId_queuedAt_idx" ON "NotificationLog"("recipientUserId", "queuedAt");

-- CreateIndex
CREATE INDEX "NotificationLog_eventKey_queuedAt_idx" ON "NotificationLog"("eventKey", "queuedAt");

-- CreateIndex
CREATE INDEX "NotificationLog_status_queuedAt_idx" ON "NotificationLog"("status", "queuedAt");

-- CreateIndex
CREATE INDEX "NotificationLog_status_claimedAt_idx" ON "NotificationLog"("status", "claimedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_eventKey_entityId_occurrenceKey_recipientUs_key" ON "NotificationLog"("eventKey", "entityId", "occurrenceKey", "recipientUserId", "channel", "offsetMinutes");

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_emailTemplateId_fkey" FOREIGN KEY ("emailTemplateId") REFERENCES "NotificationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSchedule" ADD CONSTRAINT "NotificationSchedule_eventKey_fkey" FOREIGN KEY ("eventKey") REFERENCES "NotificationEvent"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSchedule" ADD CONSTRAINT "NotificationSchedule_templateOverrideId_fkey" FOREIGN KEY ("templateOverrideId") REFERENCES "NotificationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationTemplateVersion" ADD CONSTRAINT "NotificationTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;


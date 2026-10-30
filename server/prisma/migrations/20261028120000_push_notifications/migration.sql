-- Browser push as a third notification channel.
--
-- PUSH joins EMAIL and WHATSAPP on NotificationChannel, so it is selectable per
-- schedule row exactly like the other two. Adding the value changes nothing on
-- its own: no existing row lists it, so no event sends a push until an admin
-- ticks the box. See docs/BROWSER_PUSH_PLAN.md.
--
-- PushSubscription is keyed by endpoint rather than by user because the unit of
-- consent is a browser, not an account — one person with a laptop and a phone
-- has two rows. The unique constraint is what makes a re-subscribe an update:
-- a browser that re-registers the same endpoint must not end up with two rows,
-- or every notification would arrive twice on that device.
--
-- pushNotificationsEnabled defaults TRUE, unlike the email and WhatsApp
-- columns it sits beside. Those default false because an address arriving with
-- the account is no evidence of consent. A push subscription is different: it
-- exists only because the person answered their browser's permission prompt
-- with "Allow", so the opt-in has already happened by the time there is
-- anything to send to. The column is a mute switch for someone who wants the
-- notifications to stop without revoking permission at the browser level, and
-- a user with no subscription row skips regardless of what it says.

-- AlterEnum
ALTER TYPE "NotificationChannel" ADD VALUE 'PUSH';

-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN     "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "BrandProfile" ADD COLUMN     "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSuccessAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

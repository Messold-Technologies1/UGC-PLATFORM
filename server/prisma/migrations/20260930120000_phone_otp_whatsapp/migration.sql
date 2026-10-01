-- WhatsApp-backed phone OTP, replacing Twilio Verify.
CREATE TABLE "PhoneOtp" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sendCount" INTEGER NOT NULL DEFAULT 1,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "wamid" TEXT,
    "deliveryStatus" TEXT,
    "failureCode" INTEGER,
    "failureDetail" TEXT,
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PhoneOtp_phone_purpose_createdAt_idx" ON "PhoneOtp"("phone", "purpose", "createdAt");
CREATE INDEX "PhoneOtp_expiresAt_idx" ON "PhoneOtp"("expiresAt");
CREATE INDEX "PhoneOtp_wamid_idx" ON "PhoneOtp"("wamid");
CREATE INDEX "PhoneOtp_ipHash_createdAt_idx" ON "PhoneOtp"("ipHash", "createdAt");
CREATE INDEX "PhoneOtp_createdAt_idx" ON "PhoneOtp"("createdAt");

-- Track OTP verification attempts/outcomes on User (minimal audit/counters)

ALTER TABLE "User"
ADD COLUMN "phoneOtpFailedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "phoneOtpLastAttemptAt" TIMESTAMP(3),
ADD COLUMN "phoneOtpLastStatus" TEXT,
ADD COLUMN "phoneOtpLastPhone" TEXT;

CREATE INDEX "User_phoneOtpLastAttemptAt_idx" ON "User"("phoneOtpLastAttemptAt");


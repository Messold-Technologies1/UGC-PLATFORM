-- Delivery channel for each OTP, so resends can escalate
-- WhatsApp -> Twilio SMS -> Twilio Verify, and so verification knows whether
-- the code is ours to check or Twilio's.
ALTER TABLE "PhoneOtp" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'whatsapp';

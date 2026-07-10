-- Meta (Facebook) attribution identifiers captured at creator signup and
-- replayed via the Conversions API when the creator is listed. All nullable
-- and additive so the feature stays removable (drop these columns to remove).
ALTER TABLE "CreatorProfile" ADD COLUMN "metaFbp" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN "metaFbc" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN "metaSignupIp" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN "metaSignupUserAgent" TEXT;

-- A brand now names an agency by the email that agency signs in with, so the
-- partner code and everything that supported it are gone.
--
-- Written to be re-runnable and safe on a database that never had the code
-- flow enabled: the feature ships behind AGENCY_BRAND_PARTNER_LINKS_ENABLED,
-- which has not been switched on anywhere, so in practice there is nothing in
-- these columns to lose.

-- The code itself, its issue stamp, and the rotation stamp left over from the
-- rotate button that was removed before this.
ALTER TABLE "Agency" DROP COLUMN IF EXISTS "partnerId";
ALTER TABLE "Agency" DROP COLUMN IF EXISTS "partnerIdIssuedAt";
ALTER TABLE "Agency" DROP COLUMN IF EXISTS "partnerIdRotatedAt";

-- The per-link audit of which code was redeemed becomes which email was used.
-- Nullable: rows written under the code flow have no email to record, and the
-- codes they referenced no longer exist anywhere, so there is nothing worth
-- carrying across.
ALTER TABLE "AgencyBrandLink" ADD COLUMN IF NOT EXISTS "requestedViaEmail" TEXT;
ALTER TABLE "AgencyBrandLink" DROP COLUMN IF EXISTS "partnerIdUsed";

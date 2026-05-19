-- Brief: multiple content types / tone styles; optional key points and CTA copy

ALTER TABLE "Brief" ALTER COLUMN "contentType" DROP DEFAULT;
ALTER TABLE "Brief" ALTER COLUMN "contentType" TYPE "BriefContentType"[] USING (
  CASE
    WHEN "contentType" IS NULL THEN ARRAY['CREATOR_DECIDES']::"BriefContentType"[]
    ELSE ARRAY["contentType"]::"BriefContentType"[]
  END
);
ALTER TABLE "Brief" ALTER COLUMN "contentType" SET DEFAULT ARRAY['CREATOR_DECIDES']::"BriefContentType"[];
ALTER TABLE "Brief" ALTER COLUMN "contentType" SET NOT NULL;

ALTER TABLE "Brief" ALTER COLUMN "toneStyle" DROP DEFAULT;
ALTER TABLE "Brief" ALTER COLUMN "toneStyle" TYPE "BriefToneStyle"[] USING (
  CASE
    WHEN "toneStyle" IS NULL THEN ARRAY['CREATOR_DECIDES']::"BriefToneStyle"[]
    ELSE ARRAY["toneStyle"]::"BriefToneStyle"[]
  END
);
ALTER TABLE "Brief" ALTER COLUMN "toneStyle" SET DEFAULT ARRAY['CREATOR_DECIDES']::"BriefToneStyle"[];
ALTER TABLE "Brief" ALTER COLUMN "toneStyle" SET NOT NULL;

ALTER TABLE "Brief" ADD COLUMN IF NOT EXISTS "keyNoteToInclude" TEXT;
ALTER TABLE "Brief" ADD COLUMN IF NOT EXISTS "ctaNote" TEXT;

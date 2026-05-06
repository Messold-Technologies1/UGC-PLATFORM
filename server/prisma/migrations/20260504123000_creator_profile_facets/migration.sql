-- Creator profile facets: catalog options, selections, languages with fluency; location & demographics; remove CreatorLanguage

-- CreateEnum
CREATE TYPE "CreatorFacetDimension" AS ENUM ('CASTING_TYPE', 'APPEARANCE', 'CONTENT_STYLE', 'CAPABILITY', 'LIFE_CONTEXT', 'OCCUPATION', 'INTEREST', 'CATEGORY_EXPERIENCE', 'AVAILABLE_WITH', 'LANGUAGE');

-- CreateEnum
CREATE TYPE "CreatorGender" AS ENUM ('FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY', 'OTHER');

-- CreateEnum
CREATE TYPE "CreatorContentVolumeBucket" AS ENUM ('NONE', 'RANGE_1_5', 'RANGE_5_15', 'RANGE_15_25', 'RANGE_25_50', 'RANGE_50_PLUS');

-- CreateEnum
CREATE TYPE "CreatorLanguageFluency" AS ENUM ('NATIVE', 'FLUENT', 'CONVERSATIONAL');

-- CreateEnum
CREATE TYPE "CreatorAgeGroup" AS ENUM ('AGE_18_24', 'AGE_25_34', 'AGE_35_44', 'AGE_45_54', 'AGE_55_PLUS');

-- CreateTable
CREATE TABLE "CreatorFacetOption" (
    "id" UUID NOT NULL,
    "dimension" "CreatorFacetDimension" NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorFacetOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorProfileFacetSelection" (
    "id" UUID NOT NULL,
    "creatorProfileId" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorProfileFacetSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorProfileLanguage" (
    "id" UUID NOT NULL,
    "creatorProfileId" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "fluency" "CreatorLanguageFluency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorProfileLanguage_pkey" PRIMARY KEY ("id")
);

-- AlterTable CreatorProfile: new columns + gender migration
ALTER TABLE "CreatorProfile" ADD COLUMN "cityName" TEXT,
ADD COLUMN "countryIso2" VARCHAR(2),
ADD COLUMN "stateCode" TEXT,
ADD COLUMN "dateOfBirth" DATE,
ADD COLUMN "shippingAddress" TEXT,
ADD COLUMN "instagramUrl" TEXT,
ADD COLUMN "contentVolume" "CreatorContentVolumeBucket",
ADD COLUMN "collaborationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "gender_new" "CreatorGender";

UPDATE "CreatorProfile" SET "gender_new" = CASE
  WHEN "gender" IS NULL OR TRIM("gender") = '' THEN NULL
  WHEN LOWER(TRIM("gender")) IN ('female', 'f', 'woman') THEN 'FEMALE'::"CreatorGender"
  WHEN LOWER(TRIM("gender")) IN ('male', 'm', 'man') THEN 'MALE'::"CreatorGender"
  WHEN LOWER(TRIM("gender")) IN ('non-binary', 'nonbinary', 'non_binary') THEN 'NON_BINARY'::"CreatorGender"
  WHEN LOWER(TRIM("gender")) IN ('prefer not to say', 'prefer_not_to_say') THEN 'PREFER_NOT_TO_SAY'::"CreatorGender"
  ELSE 'OTHER'::"CreatorGender"
END;

ALTER TABLE "CreatorProfile" DROP COLUMN "gender";
ALTER TABLE "CreatorProfile" RENAME COLUMN "gender_new" TO "gender";

UPDATE "CreatorProfile" SET "cityName" = "city" WHERE "cityName" IS NULL AND "city" IS NOT NULL;

CREATE INDEX "CreatorProfile_cityName_idx" ON "CreatorProfile"("cityName");
CREATE INDEX "CreatorProfile_countryIso2_idx" ON "CreatorProfile"("countryIso2");
CREATE INDEX "CreatorProfile_dateOfBirth_idx" ON "CreatorProfile"("dateOfBirth");

-- Unique / indexes for facet tables
CREATE UNIQUE INDEX "CreatorFacetOption_dimension_slug_key" ON "CreatorFacetOption"("dimension", "slug");

CREATE INDEX "CreatorFacetOption_dimension_sortOrder_idx" ON "CreatorFacetOption"("dimension", "sortOrder");

CREATE UNIQUE INDEX "CreatorProfileFacetSelection_creatorProfileId_optionId_key" ON "CreatorProfileFacetSelection"("creatorProfileId", "optionId");

CREATE INDEX "CreatorProfileFacetSelection_optionId_idx" ON "CreatorProfileFacetSelection"("optionId");

CREATE UNIQUE INDEX "CreatorProfileLanguage_creatorProfileId_optionId_key" ON "CreatorProfileLanguage"("creatorProfileId", "optionId");

CREATE INDEX "CreatorProfileLanguage_optionId_idx" ON "CreatorProfileLanguage"("optionId");

-- Seed facet options (idempotent for slug)
INSERT INTO "CreatorFacetOption" ("id", "dimension", "slug", "label", "sortOrder", "createdAt") VALUES
(gen_random_uuid(), 'LANGUAGE', 'english', 'English', 0, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'LANGUAGE', 'hindi', 'Hindi', 1, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'LANGUAGE', 'tamil', 'Tamil', 2, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'LANGUAGE', 'telugu', 'Telugu', 3, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'LANGUAGE', 'bengali', 'Bengali', 4, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'LANGUAGE', 'marathi', 'Marathi', 5, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'LANGUAGE', 'gujarati', 'Gujarati', 6, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'LANGUAGE', 'punjabi', 'Punjabi', 7, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'LANGUAGE', 'kannada', 'Kannada', 8, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'LANGUAGE', 'malayalam', 'Malayalam', 9, CURRENT_TIMESTAMP);

INSERT INTO "CreatorFacetOption" ("id", "dimension", "slug", "label", "sortOrder", "createdAt") VALUES
(gen_random_uuid(), 'CASTING_TYPE', 'solo_individual', 'Solo (Individual)', 0, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CASTING_TYPE', 'couple', 'Couple', 1, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CASTING_TYPE', 'parent_child', 'Parent + Child (Mom/Dad + Kid)', 2, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CASTING_TYPE', 'family_three_plus', 'Family (3+ members)', 3, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CASTING_TYPE', 'kids_only', 'Kids Only', 4, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CASTING_TYPE', 'pet_owner', 'Pet + Owner', 5, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CASTING_TYPE', 'friends', 'Friends', 6, CURRENT_TIMESTAMP);

INSERT INTO "CreatorFacetOption" ("id", "dimension", "slug", "label", "sortOrder", "createdAt") VALUES
(gen_random_uuid(), 'APPEARANCE', 'casual_relatable', 'Casual & Relatable', 0, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'APPEARANCE', 'premium_model', 'Premium / Model', 1, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'APPEARANCE', 'fitness_sporty', 'Fitness / Sporty', 2, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'APPEARANCE', 'plus_size', 'Plus Size', 3, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'APPEARANCE', 'bold_alternative', 'Bold / Alternative', 4, CURRENT_TIMESTAMP);

INSERT INTO "CreatorFacetOption" ("id", "dimension", "slug", "label", "sortOrder", "createdAt") VALUES
(gen_random_uuid(), 'CONTENT_STYLE', 'talking_to_camera', 'Talking to Camera', 0, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CONTENT_STYLE', 'voiceover', 'Voiceover', 1, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CONTENT_STYLE', 'product_demo', 'Product Demo', 2, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CONTENT_STYLE', 'testimonial', 'Testimonial', 3, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CONTENT_STYLE', 'aesthetic_cinematic', 'Aesthetic / Cinematic', 4, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CONTENT_STYLE', 'ugc_ad_style', 'UGC Ad Style', 5, CURRENT_TIMESTAMP);

INSERT INTO "CreatorFacetOption" ("id", "dimension", "slug", "label", "sortOrder", "createdAt") VALUES
(gen_random_uuid(), 'CAPABILITY', 'can_shoot_at_home', 'Can shoot at home', 0, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CAPABILITY', 'can_shoot_outdoor', 'Can shoot outdoor', 1, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CAPABILITY', 'can_travel_on_location', 'Can travel (on-location)', 2, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CAPABILITY', 'can_edit_videos', 'Can edit videos', 3, CURRENT_TIMESTAMP);

INSERT INTO "CreatorFacetOption" ("id", "dimension", "slug", "label", "sortOrder", "createdAt") VALUES
(gen_random_uuid(), 'LIFE_CONTEXT', 'parent', 'Parent', 0, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'LIFE_CONTEXT', 'pet_owner', 'Pet Owner', 1, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'LIFE_CONTEXT', 'luxury_lifestyle', 'Luxury Lifestyle', 2, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'LIFE_CONTEXT', 'outdoor_travel', 'Outdoor / Travel', 3, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'LIFE_CONTEXT', 'in_relationship', 'In a Relationship', 4, CURRENT_TIMESTAMP);

INSERT INTO "CreatorFacetOption" ("id", "dimension", "slug", "label", "sortOrder", "createdAt") VALUES
(gen_random_uuid(), 'OCCUPATION', 'influencer', 'Influencer', 0, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'OCCUPATION', 'actor', 'Actor', 1, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'OCCUPATION', 'fitness_trainer', 'Fitness Trainer', 2, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'OCCUPATION', 'doctor_healthcare', 'Doctor / Healthcare', 3, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'OCCUPATION', 'teacher', 'Teacher', 4, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'OCCUPATION', 'entrepreneur', 'Entrepreneur', 5, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'OCCUPATION', 'chef_food_creator', 'Chef / Food Creator', 6, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'OCCUPATION', 'photographer_videographer', 'Photographer / Videographer', 7, CURRENT_TIMESTAMP);

INSERT INTO "CreatorFacetOption" ("id", "dimension", "slug", "label", "sortOrder", "createdAt") VALUES
(gen_random_uuid(), 'INTEREST', 'fashion', 'Fashion', 0, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'INTEREST', 'beauty_skincare', 'Beauty / Skincare', 1, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'INTEREST', 'fitness_gym', 'Fitness / Gym', 2, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'INTEREST', 'food_cooking', 'Food / Cooking', 3, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'INTEREST', 'travel', 'Travel', 4, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'INTEREST', 'technology_gadgets', 'Technology / Gadgets', 5, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'INTEREST', 'home_lifestyle', 'Home / Lifestyle', 6, CURRENT_TIMESTAMP);

INSERT INTO "CreatorFacetOption" ("id", "dimension", "slug", "label", "sortOrder", "createdAt") VALUES
(gen_random_uuid(), 'CATEGORY_EXPERIENCE', 'fashion_clothing_brand', 'Fashion / Clothing Brand', 0, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CATEGORY_EXPERIENCE', 'jewelry_brand', 'Jewelry Brand', 1, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CATEGORY_EXPERIENCE', 'beauty_skincare_brand', 'Beauty / Skincare Brand', 2, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CATEGORY_EXPERIENCE', 'gym_fitness_studio', 'Gym / Fitness Studio', 3, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CATEGORY_EXPERIENCE', 'yoga_studio', 'Yoga Studio', 4, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CATEGORY_EXPERIENCE', 'restaurant_cafe', 'Restaurant / Cafe', 5, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CATEGORY_EXPERIENCE', 'cloud_kitchen_food_brand', 'Cloud Kitchen / Food Brand', 6, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CATEGORY_EXPERIENCE', 'real_estate_property', 'Real Estate / Property', 7, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CATEGORY_EXPERIENCE', 'interior_home_decor', 'Interior / Home Decor', 8, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CATEGORY_EXPERIENCE', 'salon_spa_makeup_artist', 'Salon / Spa / Makeup Artist', 9, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CATEGORY_EXPERIENCE', 'clinic_doctor_dentist', 'Clinic / Doctor / Dentist', 10, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CATEGORY_EXPERIENCE', 'coaching_education_courses', 'Coaching / Education / Courses', 11, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CATEGORY_EXPERIENCE', 'travel_hotel_airbnb', 'Travel / Hotel / Airbnb', 12, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CATEGORY_EXPERIENCE', 'ecommerce_d2c_brand', 'E-commerce / D2C Brand', 13, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CATEGORY_EXPERIENCE', 'local_business', 'Local Business (Gym, Studio, Shop)', 14, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'CATEGORY_EXPERIENCE', 'tech_product_app_saas', 'Tech Product / App / SaaS', 15, CURRENT_TIMESTAMP);

INSERT INTO "CreatorFacetOption" ("id", "dimension", "slug", "label", "sortOrder", "createdAt") VALUES
(gen_random_uuid(), 'AVAILABLE_WITH', 'partner', 'Partner', 0, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'AVAILABLE_WITH', 'child', 'Child', 1, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'AVAILABLE_WITH', 'family', 'Family', 2, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'AVAILABLE_WITH', 'friends', 'Friends', 3, CURRENT_TIMESTAMP),
(gen_random_uuid(), 'AVAILABLE_WITH', 'pets', 'Pets', 4, CURRENT_TIMESTAMP);

-- Migrate legacy CreatorLanguage rows (best-effort slug match)
INSERT INTO "CreatorProfileLanguage" ("id", "creatorProfileId", "optionId", "fluency", "createdAt")
SELECT gen_random_uuid(), cl."creatorId", fo."id", 'FLUENT'::"CreatorLanguageFluency", cl."createdAt"
FROM "CreatorLanguage" cl
INNER JOIN "CreatorFacetOption" fo ON fo."dimension" = 'LANGUAGE' AND fo."slug" = LOWER(REGEXP_REPLACE(TRIM(cl."language"), '\s+', '_', 'g'))
ON CONFLICT ("creatorProfileId", "optionId") DO NOTHING;

-- Drop legacy language table
DROP TABLE "CreatorLanguage";

-- AddForeignKey
ALTER TABLE "CreatorProfileFacetSelection" ADD CONSTRAINT "CreatorProfileFacetSelection_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorProfileFacetSelection" ADD CONSTRAINT "CreatorProfileFacetSelection_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "CreatorFacetOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorProfileLanguage" ADD CONSTRAINT "CreatorProfileLanguage_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorProfileLanguage" ADD CONSTRAINT "CreatorProfileLanguage_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "CreatorFacetOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
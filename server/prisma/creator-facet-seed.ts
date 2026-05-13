import type { PrismaClient } from '@prisma/client';
import { CreatorFacetDimension } from '@prisma/client';

type FacetRow = {
  dimension: CreatorFacetDimension;
  slug: string;
  label: string;
  sortOrder: number;
};

export const CREATOR_FACET_SEED_ROWS: FacetRow[] = [
  ...[
    ['english', 'English'],
    ['hindi', 'Hindi'],
    ['tamil', 'Tamil'],
    ['telugu', 'Telugu'],
    ['bengali', 'Bengali'],
    ['marathi', 'Marathi'],
    ['gujarati', 'Gujarati'],
    ['punjabi', 'Punjabi'],
    ['kannada', 'Kannada'],
    ['malayalam', 'Malayalam'],
  ].map(([slug, label], i) => ({
    dimension: CreatorFacetDimension.LANGUAGE,
    slug,
    label,
    sortOrder: i,
  })),
  ...[
    ['solo_individual', 'Solo (Individual)'],
    ['couple', 'Couple'],
    ['parent_child', 'Parent + Child (Mom/Dad + Kid)'],
    ['family_three_plus', 'Family (3+ members)'],
    ['kids_only', 'Kids Only'],
    ['pet_owner', 'Pet + Owner'],
    ['friends', 'Friends'],
  ].map(([slug, label], i) => ({
    dimension: CreatorFacetDimension.CONTENT_FORMAT,
    slug,
    label,
    sortOrder: i,
  })),
  ...[
    ['casual_relatable', 'Casual & Relatable'],
    ['premium_model', 'Premium / Model'],
    ['fitness_sporty', 'Fitness / Sporty'],
    ['plus_size', 'Plus Size'],
    ['bold_alternative', 'Bold / Alternative'],
  ].map(([slug, label], i) => ({
    dimension: CreatorFacetDimension.APPEARANCE,
    slug,
    label,
    sortOrder: i,
  })),
  ...[
    ['talking_to_camera', 'Talking to Camera'],
    ['voiceover', 'Voiceover'],
    ['product_demo', 'Product Demo'],
    ['testimonial', 'Testimonial'],
    ['aesthetic_cinematic', 'Aesthetic / Cinematic'],
    ['ugc_ad_style', 'UGC Ad Style'],
  ].map(([slug, label], i) => ({
    dimension: CreatorFacetDimension.CONTENT_STYLE,
    slug,
    label,
    sortOrder: i,
  })),
  ...[
    ['can_shoot_at_home', 'Can shoot at home'],
    ['can_shoot_outdoor', 'Can shoot outdoor'],
    ['can_travel_on_location', 'Can travel (on-location)'],
    ['can_edit_videos', 'Can edit videos'],
  ].map(([slug, label], i) => ({
    dimension: CreatorFacetDimension.CAPABILITY,
    slug,
    label,
    sortOrder: i,
  })),
  ...[
    ['parent', 'Parent'],
    ['pet_owner', 'Pet Owner'],
    ['luxury_lifestyle', 'Luxury Lifestyle'],
    ['outdoor_travel', 'Outdoor / Travel'],
    ['in_relationship', 'In a Relationship'],
  ].map(([slug, label], i) => ({
    dimension: CreatorFacetDimension.LIFE_STYLE,
    slug,
    label,
    sortOrder: i,
  })),
  ...[
    ['influencer', 'Influencer'],
    ['actor', 'Actor'],
    ['fitness_trainer', 'Fitness Trainer'],
    ['doctor_healthcare', 'Doctor / Healthcare'],
    ['teacher', 'Teacher'],
    ['entrepreneur', 'Entrepreneur'],
    ['chef_food_creator', 'Chef / Food Creator'],
    ['photographer_videographer', 'Photographer / Videographer'],
  ].map(([slug, label], i) => ({
    dimension: CreatorFacetDimension.OCCUPATION,
    slug,
    label,
    sortOrder: i,
  })),
  ...[
    ['fashion', 'Fashion'],
    ['beauty_skincare', 'Beauty / Skincare'],
    ['fitness_gym', 'Fitness / Gym'],
    ['food_cooking', 'Food / Cooking'],
    ['travel', 'Travel'],
    ['technology_gadgets', 'Technology / Gadgets'],
    ['home_lifestyle', 'Home / Lifestyle'],
  ].map(([slug, label], i) => ({
    dimension: CreatorFacetDimension.INTEREST,
    slug,
    label,
    sortOrder: i,
  })),
  ...[
    ['fashion_clothing_brand', 'Fashion / Clothing Brand'],
    ['jewelry_brand', 'Jewelry Brand'],
    ['beauty_skincare_brand', 'Beauty / Skincare Brand'],
    ['gym_fitness_studio', 'Gym / Fitness Studio'],
    ['yoga_studio', 'Yoga Studio'],
    ['restaurant_cafe', 'Restaurant / Cafe'],
    ['cloud_kitchen_food_brand', 'Cloud Kitchen / Food Brand'],
    ['real_estate_property', 'Real Estate / Property'],
    ['interior_home_decor', 'Interior / Home Decor'],
    ['salon_spa_makeup_artist', 'Salon / Spa / Makeup Artist'],
    ['clinic_doctor_dentist', 'Clinic / Doctor / Dentist'],
    ['coaching_education_courses', 'Coaching / Education / Courses'],
    ['travel_hotel_airbnb', 'Travel / Hotel / Airbnb'],
    ['ecommerce_d2c_brand', 'E-commerce / D2C Brand'],
    ['local_business', 'Local Business (Gym, Studio, Shop)'],
    ['tech_product_app_saas', 'Tech Product / App / SaaS'],
  ].map(([slug, label], i) => ({
    dimension: CreatorFacetDimension.CATEGORY_EXPERIENCE,
    slug,
    label,
    sortOrder: i,
  })),
  ...[
    ['partner', 'Partner'],
    ['child', 'Child'],
    ['family', 'Family'],
    ['friends', 'Friends'],
    ['pets', 'Pets'],
  ].map(([slug, label], i) => ({
    dimension: CreatorFacetDimension.CAN_CREATE_WITH,
    slug,
    label,
    sortOrder: i,
  })),
  ...[
    ['ai_subtitles', 'AI subtitles'],
    ['ai_voice_cleanup', 'AI voice cleanup'],
    ['ai_script_hook_variations', 'AI script/hook variations'],
  ].map(([slug, label], i) => ({
    dimension: CreatorFacetDimension.AI_CONTENT_PERMISSION,
    slug,
    label,
    sortOrder: i,
  })),
];

export async function seedCreatorFacetOptions(prisma: PrismaClient): Promise<void> {
  await prisma.creatorFacetOption.createMany({
    data: CREATOR_FACET_SEED_ROWS.map((r) => ({
      dimension: r.dimension,
      slug: r.slug,
      label: r.label,
      sortOrder: r.sortOrder,
    })),
    skipDuplicates: true,
  });
}

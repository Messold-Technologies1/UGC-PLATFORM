import {
  ApprovalStatus,
  CreatorFacetDimension,
  CreatorGender,
  PortfolioVisibilityStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedCreatorAddOnOptions } from './creator-addon-options-seed';
import { seedCreatorFacetOptions } from './creator-facet-seed';
import { SAMPLE_VIDEOS } from './seed-sample-media';

const prisma = new PrismaClient();

const DEFAULT_COUNT = 42;
const TEST_EMAIL_DOMAIN = 'test.gocollab.local';
const TEST_PASSWORD = 'TestCreator123!';

type Persona = {
  seedKey: string;
  displayName: string;
  gender: CreatorGender;
  city: string;
  stateName: string;
  bio: string;
  contentFormat: string;
  contentCategory: string;
  categoryExperience: string;
  languages: string[];
  optionalFacets: Partial<
    Record<
      | 'appearance'
      | 'contentStyle'
      | 'capability'
      | 'lifeStyle'
      | 'occupation'
      | 'canCreateWith'
      | 'aiContentPermission',
      string[]
    >
  >;
  portfolio: Array<{
    industryLabel: string;
    tags: string[];
    description: string;
  }>;
  restrictions?: string[];
  startingPrice: number;
  deliveryDays: number;
  collaborationCount?: number;
  avgRating?: number;
  reviewCount?: number;
};

const PERSONAS: Persona[] = [
  {
    seedKey: 'rahul-petfood',
    displayName: 'Rahul Verma',
    gender: CreatorGender.MALE,
    city: 'Mumbai',
    stateName: 'Maharashtra',
    bio: 'I create UGC ads for pet food and pet care brands. Specialize in dog food demos, treat unboxings, and playful pet-owner storytelling for D2C pet brands like Pedigree-style campaigns.',
    contentFormat: 'pet_owner',
    contentCategory: 'food_cooking',
    categoryExperience: 'ecommerce_d2c_brand',
    languages: ['english', 'hindi'],
    optionalFacets: {
      lifeStyle: ['pet_owner'],
      canCreateWith: ['pets'],
      contentStyle: ['product_demo', 'ugc_ad_style'],
      capability: ['can_shoot_at_home'],
    },
    portfolio: [
      {
        industryLabel: 'Pet Food',
        tags: ['dog food', 'product demo', 'Pedigree style'],
        description: 'Dog food bowl demo with golden retriever',
      },
      {
        industryLabel: 'Pet Care',
        tags: ['pet treats', 'unboxing', 'UGC ad'],
        description: 'Pet treat unboxing and reaction',
      },
      {
        industryLabel: 'Pet Food',
        tags: ['puppy', 'brand ad', 'talking head'],
        description: 'Pet owner testimonial for pet nutrition brand',
      },
      {
        industryLabel: 'Pet Accessories',
        tags: ['leash', 'product demo'],
        description: 'Dog leash and harness product demo',
      },
    ],
    startingPrice: 4500,
    deliveryDays: 4,
    collaborationCount: 18,
    avgRating: 4.9,
    reviewCount: 12,
  },
  {
    seedKey: 'priya-skincare-pets',
    displayName: 'Priya Sharma',
    gender: CreatorGender.FEMALE,
    city: 'Delhi',
    stateName: 'Delhi',
    bio: 'Beauty and skincare UGC creator. I mostly shoot serum, sunscreen, and makeup tutorials. Occasionally my dog makes a cameo in lifestyle skincare reels.',
    contentFormat: 'solo_individual',
    contentCategory: 'beauty_skincare',
    categoryExperience: 'beauty_skincare_brand',
    languages: ['english', 'hindi'],
    optionalFacets: {
      canCreateWith: ['pets'],
      lifeStyle: ['pet_owner'],
      appearance: ['casual_relatable'],
      contentStyle: ['talking_to_camera', 'aesthetic_cinematic'],
    },
    portfolio: [
      {
        industryLabel: 'Skincare',
        tags: ['serum', 'morning routine', 'glow'],
        description: 'Vitamin C serum morning skincare routine',
      },
      {
        industryLabel: 'Beauty',
        tags: ['sunscreen', 'product demo'],
        description: 'SPF sunscreen application demo',
      },
      {
        industryLabel: 'Skincare',
        tags: ['lifestyle', 'dog cameo'],
        description: 'Casual skincare reel with pet in background',
      },
    ],
    startingPrice: 3500,
    deliveryDays: 3,
    collaborationCount: 24,
    avgRating: 4.7,
    reviewCount: 19,
  },
  {
    seedKey: 'ananya-fitness',
    displayName: 'Ananya Iyer',
    gender: CreatorGender.FEMALE,
    city: 'Bangalore',
    stateName: 'Karnataka',
    bio: 'Fitness and gym content creator. I shoot workout supplements, activewear try-ons, and gym tour reels for fitness studios and sportswear brands.',
    contentFormat: 'solo_individual',
    contentCategory: 'fitness_gym',
    categoryExperience: 'gym_fitness_studio',
    languages: ['english', 'kannada'],
    optionalFacets: {
      appearance: ['fitness_sporty'],
      contentStyle: ['product_demo', 'talking_to_camera'],
      occupation: ['fitness_trainer'],
      capability: ['can_shoot_outdoor', 'can_travel_on_location'],
    },
    portfolio: [
      {
        industryLabel: 'Gym',
        tags: ['workout', 'supplement', 'fitness'],
        description: 'Pre-workout supplement shaker demo at gym',
      },
      {
        industryLabel: 'Fitness',
        tags: ['activewear', 'try-on'],
        description: 'Leggings and sports bra try-on haul',
      },
      {
        industryLabel: 'Gym',
        tags: ['studio tour', 'founder intro'],
        description: 'Local gym facility walkthrough',
      },
    ],
    startingPrice: 5000,
    deliveryDays: 5,
    avgRating: 4.8,
    reviewCount: 15,
  },
  {
    seedKey: 'vikram-food',
    displayName: 'Vikram Singh',
    gender: CreatorGender.MALE,
    city: 'Jaipur',
    stateName: 'Rajasthan',
    bio: 'Food and restaurant UGC specialist. Cloud kitchen unboxings, menu launches, and cafe ambience reels for F&B brands across North India.',
    contentFormat: 'solo_individual',
    contentCategory: 'food_cooking',
    categoryExperience: 'restaurant_cafe',
    languages: ['hindi', 'english'],
    optionalFacets: {
      occupation: ['chef_food_creator'],
      contentStyle: ['aesthetic_cinematic', 'product_demo'],
      capability: ['can_travel_on_location'],
    },
    portfolio: [
      {
        industryLabel: 'Restaurant',
        tags: ['food review', 'tasting', 'biryani'],
        description: 'Restaurant signature dish tasting reel',
      },
      {
        industryLabel: 'Food',
        tags: ['cloud kitchen', 'unboxing'],
        description: 'Meal kit unboxing and first bite reaction',
      },
      {
        industryLabel: 'Cafe',
        tags: ['ambience', 'latte art'],
        description: 'Cafe ambience and coffee pour-over',
      },
    ],
    startingPrice: 2800,
    deliveryDays: 4,
  },
  {
    seedKey: 'meera-fashion',
    displayName: 'Meera Kapoor',
    gender: CreatorGender.FEMALE,
    city: 'Mumbai',
    stateName: 'Maharashtra',
    bio: 'Fashion and clothing brand creator. GRWM outfits, jewelry styling, and boutique haul videos for D2C apparel labels.',
    contentFormat: 'solo_individual',
    contentCategory: 'fashion',
    categoryExperience: 'fashion_clothing_brand',
    languages: ['english', 'hindi'],
    optionalFacets: {
      appearance: ['premium_model'],
      contentStyle: ['aesthetic_cinematic', 'ugc_ad_style'],
      lifeStyle: ['luxury_lifestyle'],
    },
    portfolio: [
      {
        industryLabel: 'Fashion',
        tags: ['GRWM', 'outfit', 'haul'],
        description: 'Festive kurta set styling GRWM',
      },
      {
        industryLabel: 'Jewelry',
        tags: ['earrings', 'styling'],
        description: 'Statement jewelry pairing with ethnic wear',
      },
      {
        industryLabel: 'Fashion',
        tags: ['try-on', 'D2C brand'],
        description: 'Western co-ord set try-on for online brand',
      },
    ],
    startingPrice: 6000,
    deliveryDays: 5,
    avgRating: 4.9,
    reviewCount: 22,
  },
  {
    seedKey: 'arjun-tech',
    displayName: 'Arjun Mehta',
    gender: CreatorGender.MALE,
    city: 'Pune',
    stateName: 'Maharashtra',
    bio: 'Tech and gadgets reviewer. Unboxing earbuds, smartwatches, and app walkthroughs for SaaS and consumer electronics brands.',
    contentFormat: 'solo_individual',
    contentCategory: 'technology_gadgets',
    categoryExperience: 'tech_product_app_saas',
    languages: ['english', 'hindi'],
    optionalFacets: {
      contentStyle: ['product_demo', 'voiceover'],
      occupation: ['entrepreneur'],
      capability: ['can_shoot_at_home', 'can_edit_videos'],
      aiContentPermission: ['ai_subtitles'],
    },
    portfolio: [
      {
        industryLabel: 'Tech',
        tags: ['earbuds', 'unboxing', 'review'],
        description: 'Wireless earbuds unboxing and sound test',
      },
      {
        industryLabel: 'Gadgets',
        tags: ['smartwatch', 'features'],
        description: 'Smartwatch feature walkthrough',
      },
      {
        industryLabel: 'SaaS',
        tags: ['app demo', 'screen recording'],
        description: 'Mobile app onboarding screen recording with voiceover',
      },
    ],
    startingPrice: 4200,
    deliveryDays: 4,
  },
  {
    seedKey: 'sneha-mom-kids',
    displayName: 'Sneha Reddy',
    gender: CreatorGender.FEMALE,
    city: 'Hyderabad',
    stateName: 'Telangana',
    bio: 'Mom creator making family-friendly UGC for toys, kids snacks, and baby care brands. I film with my 4-year-old for authentic parent-child content.',
    contentFormat: 'parent_child',
    contentCategory: 'home_lifestyle',
    categoryExperience: 'ecommerce_d2c_brand',
    languages: ['english', 'telugu'],
    optionalFacets: {
      lifeStyle: ['parent'],
      canCreateWith: ['child', 'family'],
      contentStyle: ['testimonial', 'talking_to_camera'],
    },
    portfolio: [
      {
        industryLabel: 'Kids',
        tags: ['toys', 'playtime', 'mom and kid'],
        description: 'Educational toy playtime with toddler',
      },
      {
        industryLabel: 'Baby Care',
        tags: ['lotion', 'product demo'],
        description: 'Baby lotion application demo by mom',
      },
      {
        industryLabel: 'Snacks',
        tags: ['kids snacks', 'taste test'],
        description: 'Healthy kids snack taste test reaction',
      },
    ],
    startingPrice: 3800,
    deliveryDays: 5,
    collaborationCount: 14,
  },
  {
    seedKey: 'karan-real-estate',
    displayName: 'Karan Malhotra',
    gender: CreatorGender.MALE,
    city: 'Gurgaon',
    stateName: 'Haryana',
    bio: 'Real estate and property walkthrough creator. Apartment tours, amenity highlights, and broker-style explainers for builders and Airbnb hosts.',
    contentFormat: 'solo_individual',
    contentCategory: 'travel',
    categoryExperience: 'real_estate_property',
    languages: ['english', 'hindi'],
    optionalFacets: {
      contentStyle: ['voiceover', 'aesthetic_cinematic'],
      capability: ['can_travel_on_location', 'can_shoot_outdoor'],
      occupation: ['entrepreneur'],
    },
    portfolio: [
      {
        industryLabel: 'Real Estate',
        tags: ['apartment tour', 'walkthrough'],
        description: '2BHK furnished apartment full walkthrough',
      },
      {
        industryLabel: 'Property',
        tags: ['amenities', 'pool', 'gym'],
        description: 'Society amenities highlight reel',
      },
      {
        industryLabel: 'Airbnb',
        tags: ['short stay', 'room tour'],
        description: 'Boutique homestay room and balcony tour',
      },
    ],
    startingPrice: 7500,
    deliveryDays: 6,
  },
  {
    seedKey: 'divya-salon',
    displayName: 'Divya Nair',
    gender: CreatorGender.FEMALE,
    city: 'Kochi',
    stateName: 'Kerala',
    bio: 'Salon, spa, and makeup UGC creator. Bridal makeup transitions, hair spa demos, and salon ambience reels for beauty service businesses.',
    contentFormat: 'solo_individual',
    contentCategory: 'beauty_skincare',
    categoryExperience: 'salon_spa_makeup_artist',
    languages: ['english', 'malayalam'],
    optionalFacets: {
      appearance: ['premium_model'],
      contentStyle: ['aesthetic_cinematic', 'product_demo'],
      occupation: ['actor'],
    },
    portfolio: [
      {
        industryLabel: 'Salon',
        tags: ['bridal makeup', 'transformation'],
        description: 'Bridal makeup before and after transition',
      },
      {
        industryLabel: 'Spa',
        tags: ['hair spa', 'treatment'],
        description: 'Hair spa treatment process highlights',
      },
      {
        industryLabel: 'Makeup',
        tags: ['lipstick', 'swatch'],
        description: 'Lipstick shade swatch and wear test',
      },
    ],
    startingPrice: 4000,
    deliveryDays: 4,
  },
  {
    seedKey: 'rohan-couple',
    displayName: 'Rohan & Aisha Khan',
    gender: CreatorGender.MALE,
    city: 'Lucknow',
    stateName: 'Uttar Pradesh',
    bio: 'Couple creators for lifestyle, food dates, and home decor brands. We shoot relatable couple POV content for apps, restaurants, and furniture labels.',
    contentFormat: 'couple',
    contentCategory: 'home_lifestyle',
    categoryExperience: 'restaurant_cafe',
    languages: ['hindi', 'english'],
    optionalFacets: {
      lifeStyle: ['in_relationship'],
      canCreateWith: ['partner'],
      contentStyle: ['talking_to_camera', 'ugc_ad_style'],
      appearance: ['casual_relatable'],
    },
    portfolio: [
      {
        industryLabel: 'Restaurant',
        tags: ['date night', 'couple POV'],
        description: 'Couple dinner date tasting reel',
      },
      {
        industryLabel: 'Home Decor',
        tags: ['living room', 'styling'],
        description: 'Weekend home styling vlog as a couple',
      },
      {
        industryLabel: 'Food',
        tags: ['dessert', 'reaction'],
        description: 'Dessert platter first bite couple reaction',
      },
    ],
    startingPrice: 5500,
    deliveryDays: 5,
  },
  {
    seedKey: 'tanya-travel',
    displayName: 'Tanya Das',
    gender: CreatorGender.FEMALE,
    city: 'Goa',
    stateName: 'Goa',
    bio: 'Travel and hospitality creator. Hotel room tours, beach resort highlights, and experience reels for travel brands and Airbnb hosts.',
    contentFormat: 'solo_individual',
    contentCategory: 'travel',
    categoryExperience: 'travel_hotel_airbnb',
    languages: ['english', 'hindi', 'bengali'],
    optionalFacets: {
      lifeStyle: ['outdoor_travel'],
      contentStyle: ['aesthetic_cinematic', 'voiceover'],
      capability: ['can_travel_on_location', 'can_shoot_outdoor'],
    },
    portfolio: [
      {
        industryLabel: 'Travel',
        tags: ['hotel tour', 'sea view'],
        description: 'Beach resort room and balcony tour',
      },
      {
        industryLabel: 'Hospitality',
        tags: ['breakfast', 'buffet'],
        description: 'Hotel breakfast buffet ambience reel',
      },
      {
        industryLabel: 'Airbnb',
        tags: ['villa', 'pool'],
        description: 'Private villa pool and deck walkthrough',
      },
    ],
    startingPrice: 6500,
    deliveryDays: 5,
  },
  {
    seedKey: 'imran-clinic',
    displayName: 'Dr. Imran Sheikh',
    gender: CreatorGender.MALE,
    city: 'Ahmedabad',
    stateName: 'Gujarat',
    bio: 'Doctor and healthcare educator creating clinic explainers, dental awareness reels, and patient-friendly testimonial-style content for clinics.',
    contentFormat: 'solo_individual',
    contentCategory: 'health_wellness',
    categoryExperience: 'clinic_doctor_dentist',
    languages: ['english', 'gujarati', 'hindi'],
    optionalFacets: {
      occupation: ['doctor_healthcare'],
      contentStyle: ['talking_to_camera', 'testimonial'],
      appearance: ['casual_relatable'],
    },
    portfolio: [
      {
        industryLabel: 'Clinic',
        tags: ['dental care', 'explainer'],
        description: 'Teeth whitening procedure explainer',
      },
      {
        industryLabel: 'Healthcare',
        tags: ['doctor', 'tips'],
        description: 'Daily oral hygiene tips talking head',
      },
      {
        industryLabel: 'Clinic',
        tags: ['testimonial', 'patient story'],
        description: 'Clinic experience testimonial style reel',
      },
    ],
    startingPrice: 8000,
    deliveryDays: 7,
  },
  {
    seedKey: 'neha-yoga',
    displayName: 'Neha Joshi',
    gender: CreatorGender.FEMALE,
    city: 'Rishikesh',
    stateName: 'Uttarakhand',
    bio: 'Yoga and wellness creator for studios, mats, and supplement brands. Calm voiceover flows, morning ritual content, and retreat ambience reels.',
    contentFormat: 'solo_individual',
    contentCategory: 'health_wellness',
    categoryExperience: 'yoga_studio',
    languages: ['english', 'hindi'],
    optionalFacets: {
      appearance: ['fitness_sporty'],
      contentStyle: ['voiceover', 'aesthetic_cinematic'],
      capability: ['can_shoot_outdoor'],
      lifeStyle: ['outdoor_travel'],
    },
    portfolio: [
      {
        industryLabel: 'Yoga',
        tags: ['morning flow', 'mat demo'],
        description: 'Sun salutation flow on branded yoga mat',
      },
      {
        industryLabel: 'Wellness',
        tags: ['supplement', 'ashwagandha'],
        description: 'Ayurvedic supplement morning ritual',
      },
      {
        industryLabel: 'Yoga Studio',
        tags: ['studio ambience', 'meditation'],
        description: 'Studio space ambience and meditation corner',
      },
    ],
    startingPrice: 3600,
    deliveryDays: 4,
  },
  {
    seedKey: 'sameer-auto',
    displayName: 'Sameer Patil',
    gender: CreatorGender.MALE,
    city: 'Nagpur',
    stateName: 'Maharashtra',
    bio: 'Automobile enthusiast creating car feature walkthroughs, dealership POV test drives, and accessory install demos for auto brands and local dealers.',
    contentFormat: 'solo_individual',
    contentCategory: 'technology_gadgets',
    categoryExperience: 'local_business',
    languages: ['marathi', 'hindi', 'english'],
    optionalFacets: {
      contentStyle: ['product_demo', 'voiceover'],
      capability: ['can_travel_on_location', 'can_shoot_outdoor'],
    },
    portfolio: [
      {
        industryLabel: 'Automobile',
        tags: ['test drive', 'SUV features'],
        description: 'SUV interior features walkthrough',
      },
      {
        industryLabel: 'Car Accessories',
        tags: ['dashcam', 'install'],
        description: 'Dashcam install and demo drive',
      },
      {
        industryLabel: 'Dealership',
        tags: ['showroom', 'walkaround'],
        description: 'Dealership showroom vehicle walkaround',
      },
    ],
    startingPrice: 7000,
    deliveryDays: 6,
  },
  {
    seedKey: 'lakshmi-cooking',
    displayName: 'Lakshmi Venkatesh',
    gender: CreatorGender.FEMALE,
    city: 'Chennai',
    stateName: 'Tamil Nadu',
    bio: 'South Indian home cooking creator for masala brands, kitchen appliances, and cloud kitchen launches. Authentic Tamil kitchen POV recipe reels.',
    contentFormat: 'solo_individual',
    contentCategory: 'food_cooking',
    categoryExperience: 'cloud_kitchen_food_brand',
    languages: ['tamil', 'english'],
    optionalFacets: {
      occupation: ['chef_food_creator'],
      contentStyle: ['product_demo', 'talking_to_camera'],
      capability: ['can_shoot_at_home'],
    },
    portfolio: [
      {
        industryLabel: 'Food',
        tags: ['masala', 'recipe', 'kitchen POV'],
        description: 'Sambar masala recipe using branded spice mix',
      },
      {
        industryLabel: 'Kitchen Appliance',
        tags: ['mixer grinder', 'demo'],
        description: 'Mixer grinder chutney demo in home kitchen',
      },
      {
        industryLabel: 'Cloud Kitchen',
        tags: ['meal prep', 'packaging'],
        description: 'Meal prep packaging and plating for delivery brand',
      },
    ],
    startingPrice: 3200,
    deliveryDays: 4,
  },
  {
    seedKey: 'aditya-education',
    displayName: 'Aditya Banerjee',
    gender: CreatorGender.MALE,
    city: 'Kolkata',
    stateName: 'West Bengal',
    bio: 'Education and coaching creator. Course promos, teacher-style explainers, and student testimonial formats for edtech and coaching institutes.',
    contentFormat: 'solo_individual',
    contentCategory: 'technology_gadgets',
    categoryExperience: 'coaching_education_courses',
    languages: ['english', 'bengali', 'hindi'],
    optionalFacets: {
      occupation: ['teacher'],
      contentStyle: ['talking_to_camera', 'voiceover'],
      aiContentPermission: ['ai_script_hook_variations', 'ai_subtitles'],
    },
    portfolio: [
      {
        industryLabel: 'EdTech',
        tags: ['course promo', 'teacher'],
        description: 'Online course value proposition explainer',
      },
      {
        industryLabel: 'Coaching',
        tags: ['test prep', 'tips'],
        description: 'Exam preparation strategy tips reel',
      },
      {
        industryLabel: 'Education',
        tags: ['student testimonial'],
        description: 'Student success story testimonial format',
      },
    ],
    startingPrice: 4500,
    deliveryDays: 5,
  },
  {
    seedKey: 'isha-interior',
    displayName: 'Isha Kulkarni',
    gender: CreatorGender.FEMALE,
    city: 'Pune',
    stateName: 'Maharashtra',
    bio: 'Interior and home decor creator. Room makeovers, furniture unboxing, and decor styling for D2C furniture and home lifestyle brands.',
    contentFormat: 'solo_individual',
    contentCategory: 'home_lifestyle',
    categoryExperience: 'interior_home_decor',
    languages: ['english', 'marathi'],
    optionalFacets: {
      contentStyle: ['aesthetic_cinematic', 'product_demo'],
      lifeStyle: ['luxury_lifestyle'],
      capability: ['can_shoot_at_home'],
    },
    portfolio: [
      {
        industryLabel: 'Home Decor',
        tags: ['room makeover', 'before after'],
        description: 'Bedroom makeover before and after styling',
      },
      {
        industryLabel: 'Furniture',
        tags: ['sofa', 'unboxing', 'assembly'],
        description: 'Modular sofa unboxing and assembly timelapse',
      },
      {
        industryLabel: 'Interior',
        tags: ['lamp', 'styling'],
        description: 'Statement lamp styling on sideboard',
      },
    ],
    startingPrice: 4800,
    deliveryDays: 5,
  },
  {
    seedKey: 'manav-influencer',
    displayName: 'Manav Gill',
    gender: CreatorGender.MALE,
    city: 'Chandigarh',
    stateName: 'Punjab',
    bio: 'Punjabi lifestyle influencer doing bold streetwear hauls, sneaker unboxings, and energetic talking-head ads for youth D2C brands.',
    contentFormat: 'solo_individual',
    contentCategory: 'fashion',
    categoryExperience: 'ecommerce_d2c_brand',
    languages: ['punjabi', 'hindi', 'english'],
    optionalFacets: {
      occupation: ['influencer'],
      appearance: ['bold_alternative'],
      contentStyle: ['ugc_ad_style', 'talking_to_camera'],
      lifeStyle: ['outdoor_travel'],
    },
    portfolio: [
      {
        industryLabel: 'Streetwear',
        tags: ['sneakers', 'unboxing'],
        description: 'Limited edition sneaker unboxing hype reel',
      },
      {
        industryLabel: 'Fashion',
        tags: ['hoodie', 'try-on'],
        description: 'Oversized hoodie try-on for streetwear label',
      },
      {
        industryLabel: 'D2C',
        tags: ['talking head', 'CTA'],
        description: 'High energy product hook talking-head ad',
      },
    ],
    startingPrice: 5200,
    deliveryDays: 3,
    avgRating: 4.6,
    reviewCount: 11,
  },
  {
    seedKey: 'pooja-plus-size',
    displayName: 'Pooja Menon',
    gender: CreatorGender.FEMALE,
    city: 'Thane',
    stateName: 'Maharashtra',
    bio: 'Plus-size fashion creator promoting inclusive sizing, confident try-ons, and body-positive GRWM content for apparel brands.',
    contentFormat: 'solo_individual',
    contentCategory: 'fashion',
    categoryExperience: 'fashion_clothing_brand',
    languages: ['english', 'hindi', 'marathi'],
    optionalFacets: {
      appearance: ['plus_size', 'casual_relatable'],
      contentStyle: ['talking_to_camera', 'testimonial'],
      lifeStyle: ['in_relationship'],
      canCreateWith: ['partner'],
    },
    portfolio: [
      {
        industryLabel: 'Fashion',
        tags: ['plus size', 'try-on', 'inclusive'],
        description: 'Curve-friendly dress try-on haul',
      },
      {
        industryLabel: 'Clothing',
        tags: ['GRWM', 'confidence'],
        description: 'GRWM office outfit body-positive messaging',
      },
      {
        industryLabel: 'Fashion',
        tags: ['lingerie', 'comfort'],
        description: 'Comfort wear brand try-on testimonial',
      },
    ],
    restrictions: ['alcohol'],
    startingPrice: 4100,
    deliveryDays: 4,
  },
  {
    seedKey: 'harsh-family',
    displayName: 'The Sharma Family',
    gender: CreatorGender.MALE,
    city: 'Indore',
    stateName: 'Madhya Pradesh',
    bio: 'Family of four creating multi-person UGC for FMCG, snacks, and board games. Wholesome family reaction and unboxing formats.',
    contentFormat: 'family_three_plus',
    contentCategory: 'food_cooking',
    categoryExperience: 'ecommerce_d2c_brand',
    languages: ['hindi', 'english'],
    optionalFacets: {
      canCreateWith: ['family', 'child'],
      lifeStyle: ['parent'],
      contentStyle: ['testimonial', 'product_demo'],
    },
    portfolio: [
      {
        industryLabel: 'Snacks',
        tags: ['family taste test', 'chips'],
        description: 'Family chips flavor taste test challenge',
      },
      {
        industryLabel: 'FMCG',
        tags: ['detergent', 'review'],
        description: 'Laundry detergent family review skit',
      },
      {
        industryLabel: 'Games',
        tags: ['board game', 'family night'],
        description: 'Board game family night unboxing',
      },
    ],
    startingPrice: 6800,
    deliveryDays: 6,
  },
];

// Generate additional varied personas to reach target count.
const EXTRA_CITIES = [
  { city: 'Surat', state: 'Gujarat' },
  { city: 'Bhopal', state: 'Madhya Pradesh' },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { city: 'Coimbatore', state: 'Tamil Nadu' },
  { city: 'Noida', state: 'Uttar Pradesh' },
  { city: 'Mysuru', state: 'Karnataka' },
  { city: 'Guwahati', state: 'Assam' },
  { city: 'Patna', state: 'Bihar' },
  { city: 'Thiruvananthapuram', state: 'Kerala' },
  { city: 'Raipur', state: 'Chhattisgarh' },
  { city: 'Dehradun', state: 'Uttarakhand' },
  { city: 'Varanasi', state: 'Uttar Pradesh' },
  { city: 'Agra', state: 'Uttar Pradesh' },
  { city: 'Udaipur', state: 'Rajasthan' },
  { city: 'Mangalore', state: 'Karnataka' },
  { city: 'Nashik', state: 'Maharashtra' },
  { city: 'Vadodara', state: 'Gujarat' },
  { city: 'Ranchi', state: 'Jharkhand' },
  { city: 'Amritsar', state: 'Punjab' },
  { city: 'Jodhpur', state: 'Rajasthan' },
  { city: 'Shillong', state: 'Meghalaya' },
  { city: 'Hubli', state: 'Karnataka' },
];

const EXTRA_NAMES = [
  'Aarav Desai',
  'Kavya Pillai',
  'Ritika Bose',
  'Nikhil Rao',
  'Simran Kaur',
  'Farhan Ali',
  'Deepa Chatterjee',
  'Yash Agarwal',
  'Nandini Hegde',
  'Kabir Hussain',
  'Riya Thomas',
  'Devansh Sinha',
  'Anjali Mishra',
  'Harshit Rawat',
  'Sana Qureshi',
  'Vivek Nambiar',
  'Trisha Gohil',
  'Mohit Saxena',
  'Esha Dutta',
  'Ayaan Khanna',
  'Palak Bansal',
  'Rehan Mirza',
];

const CATEGORY_COMBOS = [
  {
    contentCategory: 'beauty_skincare',
    categoryExperience: 'beauty_skincare_brand',
    industries: ['Skincare', 'Beauty', 'Makeup'],
    tags: ['serum', 'routine', 'glow', 'product demo'],
    bio: 'Beauty creator focused on skincare routines, product demos, and authentic testimonial ads for D2C beauty labels.',
    contentFormat: 'solo_individual',
  },
  {
    contentCategory: 'fitness_gym',
    categoryExperience: 'gym_fitness_studio',
    industries: ['Gym', 'Fitness', 'Supplements'],
    tags: ['workout', 'protein', 'activewear', 'gym tour'],
    bio: 'Fitness creator shooting gym promos, supplement demos, and workout apparel content for health brands.',
    contentFormat: 'solo_individual',
  },
  {
    contentCategory: 'food_cooking',
    categoryExperience: 'cloud_kitchen_food_brand',
    industries: ['Food', 'Restaurant', 'Snacks'],
    tags: ['recipe', 'taste test', 'unboxing', 'kitchen POV'],
    bio: 'Food content specialist for restaurants, snack brands, and cloud kitchen launches with tasty reaction formats.',
    contentFormat: 'solo_individual',
  },
  {
    contentCategory: 'fashion',
    categoryExperience: 'fashion_clothing_brand',
    industries: ['Fashion', 'Clothing', 'Accessories'],
    tags: ['haul', 'try-on', 'GRWM', 'styling'],
    bio: 'Fashion UGC creator for apparel try-ons, styling reels, and seasonal collection promos.',
    contentFormat: 'solo_individual',
  },
  {
    contentCategory: 'home_lifestyle',
    categoryExperience: 'interior_home_decor',
    industries: ['Home Decor', 'Furniture', 'Lifestyle'],
    tags: ['room tour', 'styling', 'unboxing', 'aesthetic'],
    bio: 'Home and lifestyle creator for decor styling, furniture demos, and cozy aesthetic brand content.',
    contentFormat: 'solo_individual',
  },
  {
    contentCategory: 'technology_gadgets',
    categoryExperience: 'tech_product_app_saas',
    industries: ['Tech', 'Gadgets', 'Apps'],
    tags: ['unboxing', 'review', 'features', 'demo'],
    bio: 'Tech reviewer creating gadget unboxings, feature explainers, and app walkthroughs for product teams.',
    contentFormat: 'solo_individual',
  },
  {
    contentCategory: 'travel',
    categoryExperience: 'travel_hotel_airbnb',
    industries: ['Travel', 'Hotel', 'Resort'],
    tags: ['room tour', 'getaway', 'ambience', 'experience'],
    bio: 'Travel creator producing hotel tours, destination highlights, and hospitality experience reels.',
    contentFormat: 'solo_individual',
  },
  {
    contentCategory: 'health_wellness',
    categoryExperience: 'clinic_doctor_dentist',
    industries: ['Healthcare', 'Wellness', 'Clinic'],
    tags: ['tips', 'explainer', 'testimonial', 'routine'],
    bio: 'Wellness educator making approachable health tips, clinic explainers, and routine-based product content.',
    contentFormat: 'solo_individual',
  },
];

const OPTIONAL_FACET_POOL = {
  appearance: ['casual_relatable', 'premium_model', 'fitness_sporty', 'plus_size'],
  contentStyle: ['talking_to_camera', 'product_demo', 'ugc_ad_style', 'aesthetic_cinematic'],
  capability: ['can_shoot_at_home', 'can_shoot_outdoor', 'can_travel_on_location'],
  lifeStyle: ['parent', 'pet_owner', 'outdoor_travel', 'luxury_lifestyle'],
  occupation: ['influencer', 'fitness_trainer', 'teacher', 'entrepreneur'],
  canCreateWith: ['pets', 'child', 'partner', 'friends'],
  aiContentPermission: ['ai_subtitles', 'ai_voice_cleanup'],
} as const;

function buildExtraPersonas(targetTotal: number): Persona[] {
  const extras: Persona[] = [];
  let i = 0;
  while (PERSONAS.length + extras.length < targetTotal) {
    const name = EXTRA_NAMES[i % EXTRA_NAMES.length]!;
    const loc = EXTRA_CITIES[i % EXTRA_CITIES.length]!;
    const combo = CATEGORY_COMBOS[i % CATEGORY_COMBOS.length]!;
    const seedKey = `ai-creator-${String(i + 1).padStart(2, '0')}`;
    const gender =
      i % 3 === 0
        ? CreatorGender.FEMALE
        : i % 3 === 1
          ? CreatorGender.MALE
          : CreatorGender.NON_BINARY;

    const optionalFacets: Persona['optionalFacets'] = {};
    if (i % 4 === 0) optionalFacets.canCreateWith = ['pets'];
    if (i % 5 === 0) optionalFacets.lifeStyle = ['pet_owner'];
    if (i % 2 === 0)
      optionalFacets.appearance = [
        OPTIONAL_FACET_POOL.appearance[i % OPTIONAL_FACET_POOL.appearance.length]!,
      ];
    if (i % 3 === 0)
      optionalFacets.contentStyle = [
        OPTIONAL_FACET_POOL.contentStyle[i % OPTIONAL_FACET_POOL.contentStyle.length]!,
      ];

    const industry = combo.industries[i % combo.industries.length]!;
    extras.push({
      seedKey,
      displayName: name,
      gender,
      city: loc.city,
      stateName: loc.state,
      bio: `${combo.bio} Based in ${loc.city}.`,
      contentFormat: combo.contentFormat,
      contentCategory: combo.contentCategory,
      categoryExperience: combo.categoryExperience,
      languages:
        i % 2 === 0 ? ['english', 'hindi'] : ['hindi', 'english'],
      optionalFacets,
      portfolio: [
        {
          industryLabel: industry,
          tags: [combo.tags[0]!, combo.tags[1]!, 'UGC'],
          description: `${industry} brand product demo reel`,
        },
        {
          industryLabel: combo.industries[(i + 1) % combo.industries.length]!,
          tags: [combo.tags[2]!, 'testimonial'],
          description: 'Talking-head testimonial style ad',
        },
        {
          industryLabel: combo.industries[(i + 2) % combo.industries.length]!,
          tags: [combo.tags[3] ?? 'aesthetic', 'relatable'],
          description: 'Aesthetic lifestyle integration for brand',
        },
      ],
      startingPrice: 2500 + (i % 8) * 500,
      deliveryDays: 3 + (i % 4),
      collaborationCount: i % 7,
      avgRating: i % 5 === 0 ? 4.5 + (i % 5) * 0.1 : undefined,
      reviewCount: i % 5 === 0 ? 5 + (i % 10) : undefined,
    });
    i += 1;
  }
  return extras;
}

function dbFingerprint(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return 'DATABASE_URL=<missing>';
  try {
    const u = new URL(url);
    return `host=${u.host} db=${u.pathname.replace(/^\//, '') || '<no-db>'}`;
  } catch {
    return 'DATABASE_URL=<unparseable>';
  }
}

type FacetMaps = {
  byDimensionSlug: Map<string, { id: string; dimension: CreatorFacetDimension }>;
};

async function loadFacetMaps(): Promise<FacetMaps> {
  const options = await prisma.creatorFacetOption.findMany({
    select: { id: true, dimension: true, slug: true },
  });
  const byDimensionSlug = new Map<
    string,
    { id: string; dimension: CreatorFacetDimension }
  >();
  for (const opt of options) {
    byDimensionSlug.set(`${opt.dimension}:${opt.slug}`, {
      id: opt.id,
      dimension: opt.dimension,
    });
  }
  return { byDimensionSlug };
}

function resolveFacetId(
  maps: FacetMaps,
  dimension: CreatorFacetDimension,
  slug: string,
): string {
  const hit = maps.byDimensionSlug.get(`${dimension}:${slug}`);
  if (!hit) {
    throw new Error(`Missing facet option ${dimension} / ${slug}`);
  }
  return hit.id;
}

// Only dimensions that still exist are mapped; personas may still list retired
// optional facets in their test data, but those keys resolve to no dimension
// and are skipped when seeding.
const optionalDimensionMap: Partial<
  Record<keyof NonNullable<Persona['optionalFacets']>, CreatorFacetDimension>
> = {
  appearance: CreatorFacetDimension.APPEARANCE,
  occupation: CreatorFacetDimension.OCCUPATION,
};

function ageDateOfBirth(ageYears: number): Date {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - ageYears);
  d.setUTCMonth(5);
  d.setUTCDate(15);
  return d;
}

async function ensureCreatorRoleId(): Promise<string> {
  const role = await prisma.role.findUnique({
    where: { name: 'CREATOR' },
    select: { id: true },
  });
  if (!role) {
    throw new Error('CREATOR role missing. Run `npm run prisma:seed` first.');
  }
  return role.id;
}

async function seedOneCreator(
  persona: Persona,
  index: number,
  maps: FacetMaps,
  creatorRoleId: string,
  passwordHash: string,
): Promise<'created' | 'skipped'> {
  const email = `ai-search-${persona.seedKey}@${TEST_EMAIL_DOMAIN}`.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, creatorProfile: { select: { id: true } } },
  });
  if (existing?.creatorProfile) {
    return 'skipped';
  }

  const publicSlug = `ai-${persona.seedKey}`;
  const profileImageUrl = `https://i.pravatar.cc/400?u=${encodeURIComponent(persona.seedKey)}`;
  const introVideoUrl = SAMPLE_VIDEOS[index % SAMPLE_VIDEOS.length]!;

  const facetOptionIds = new Set<string>([
    resolveFacetId(
      maps,
      CreatorFacetDimension.CONTENT_CATEGORY,
      persona.contentCategory,
    ),
  ]);

  if (persona.optionalFacets) {
    for (const [key, slugs] of Object.entries(persona.optionalFacets)) {
      const dimension =
        optionalDimensionMap[key as keyof typeof optionalDimensionMap];
      if (!dimension) continue;
      for (const slug of slugs ?? []) {
        facetOptionIds.add(resolveFacetId(maps, dimension, slug));
      }
    }
  }

  const languageOptionIds = persona.languages.map((slug) =>
    resolveFacetId(maps, CreatorFacetDimension.LANGUAGE, slug),
  );

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name: persona.displayName,
        passwordHash,
        status: 'ACTIVE',
        emailVerified: true,
        primaryRoleId: creatorRoleId,
        userRoles: {
          create: { roleId: creatorRoleId },
        },
      },
    });

    const creatorProfile = await tx.creatorProfile.create({
      data: {
        userId: user.id,
        displayName: persona.displayName,
        publicSlug,
        profileImageUrl,
        introVideoUrl,
        profileImageKey: `seed/${persona.seedKey}/avatar.jpg`,
        introVideoKey: `seed/${persona.seedKey}/intro.mp4`,
        bio: persona.bio,
        city: persona.city,
        stateName: persona.stateName,
        countryName: 'India',
        gender: persona.gender,
        dateOfBirth: ageDateOfBirth(22 + (index % 18)),
        shippingAddress: `${100 + index} Test Street, ${persona.city}, ${persona.stateName}, India`,
        contactEmail: email,
        onLocationAvailable: index % 3 === 0,
        travelRadius: index % 3 === 0 ? 25 : null,
        collaborationCount: persona.collaborationCount ?? index % 12,
        contentVolume: 'RANGE_5_15',
        completeProfile: true,
        isListed: true,
      },
    });

    await tx.creatorApproval.create({
      data: {
        creatorId: creatorProfile.id,
        status: ApprovalStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    await tx.creatorProfileFacetSelection.createMany({
      data: [...facetOptionIds].map((optionId) => ({
        creatorProfileId: creatorProfile.id,
        optionId,
      })),
    });

    await tx.creatorProfileLanguage.createMany({
      data: languageOptionIds.map((optionId) => ({
        creatorProfileId: creatorProfile.id,
        optionId,
      })),
    });

    if (persona.restrictions?.length) {
      await tx.creatorRestriction.createMany({
        data: persona.restrictions.map((restriction) => ({
          creatorId: creatorProfile.id,
          restriction,
        })),
        skipDuplicates: true,
      });
    }

    await tx.creatorPackage.create({
      data: {
        creatorId: creatorProfile.id,
        name: index % 2 === 0 ? 'Standard' : 'Essential',
        deliverables: ['1 Video', 'Basic editing', 'Vertical 9:16'],
        videoLengthSeconds: 60,
        priceAmount: new Prisma.Decimal(persona.startingPrice),
        deliveryDays: persona.deliveryDays,
        maxRevisions: 2,
      },
    });

    if (index % 2 === 0) {
      await tx.creatorAddOn.createMany({
        data: [
          {
            creatorId: creatorProfile.id,
            name: 'Extra Revision',
            priceAmount: new Prisma.Decimal(200),
            description: 'One additional revision round',
          },
        ],
      });
    }

    for (let v = 0; v < persona.portfolio.length; v++) {
      const item = persona.portfolio[v]!;
      const video = await tx.creatorPortfolioVideo.create({
        data: {
          creatorId: creatorProfile.id,
          videoKey: `seed/${persona.seedKey}/video-${v + 1}.mp4`,
          videoUrl: SAMPLE_VIDEOS[(index + v) % SAMPLE_VIDEOS.length]!,
          thumbnailUrl: `https://i.pravatar.cc/640?u=${encodeURIComponent(`${persona.seedKey}-v${v}`)}`,
          thumbnailKey: `seed/${persona.seedKey}/thumb-${v + 1}.jpg`,
          industryLabel: item.industryLabel,
          description: item.description,
          language: persona.languages[0] ?? 'english',
          visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
        },
      });

      await tx.creatorPortfolioVideoTag.createMany({
        data: item.tags.map((tag) => ({ videoId: video.id, tag })),
        skipDuplicates: true,
      });
    }

    await tx.creatorStats.create({
      data: {
        creatorId: creatorProfile.id,
        avgRating:
          persona.avgRating != null
            ? new Prisma.Decimal(persona.avgRating.toFixed(2))
            : null,
        reviewCount: persona.reviewCount ?? 0,
        completedOrders: persona.reviewCount ?? 0,
        totalOrders: (persona.reviewCount ?? 0) + (index % 3),
      },
    });
  });

  return 'created';
}

async function main(): Promise<void> {
  const targetCount = Number.parseInt(
    process.env.SEED_AI_SEARCH_CREATORS_COUNT ?? String(DEFAULT_COUNT),
    10,
  );
  if (!Number.isFinite(targetCount) || targetCount < 1) {
    throw new Error('SEED_AI_SEARCH_CREATORS_COUNT must be a positive integer');
  }

  console.log(
    `[seed-ai-search] Starting (${dbFingerprint()}). Target listed creators: ${targetCount}`,
  );

  await seedCreatorFacetOptions(prisma);
  await seedCreatorAddOnOptions(prisma);

  const maps = await loadFacetMaps();
  const creatorRoleId = await ensureCreatorRoleId();
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const allPersonas = [...PERSONAS, ...buildExtraPersonas(targetCount)];

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < allPersonas.length; i++) {
    const result = await seedOneCreator(
      allPersonas[i]!,
      i,
      maps,
      creatorRoleId,
      passwordHash,
    );
    if (result === 'created') created += 1;
    else skipped += 1;
  }

  const listedCount = await prisma.creatorProfile.count({
    where: { isListed: true },
  });
  const seededListedCount = await prisma.creatorProfile.count({
    where: {
      isListed: true,
      user: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } },
    },
  });

  console.log(
    `[seed-ai-search] Done. created=${created} skipped=${skipped} ` +
      `seededListed=${seededListedCount} totalListed=${listedCount}`,
  );
  console.log(
    `[seed-ai-search] Test login pattern: ai-search-<seedKey>@${TEST_EMAIL_DOMAIN} / ${TEST_PASSWORD}`,
  );
}

(async () => {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();

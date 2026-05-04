
export type BrandCategoryApi =
  | "APPAREL_AND_FASHION"
  | "ELECTRONICS_AND_GADGETS"
  | "HEALTH_AND_BEAUTY"
  | "FOOD_AND_BEVERAGES"
  | "HOME_AND_LIFESTYLE"
  | "SPORTS_AND_FITNESS"
  | "TOYS_AND_KIDS"
  | "PETS_AND_ANIMALS"
  | "AUTOMOBILE_AND_VEHICLES"
  | "REAL_ESTATE"
  | "RESTAURANTS_AND_CAFES"
  | "CLINICS_AND_HEALTHCARE"
  | "SALONS_AND_PERSONAL_CARE"
  | "EDUCATION_AND_COACHING"
  | "TRAVEL_AND_HOSPITALITY"
  | "LOCAL_BUSINESSES"
  | "SAAS_AND_APPS"
  | "PROFESSIONAL_SERVICES"
  | "OTHER";

export type BrandProductTypeApi = "PHYSICAL" | "DIGITAL" | "BOTH";


export const BRAND_CATEGORY_LABEL: Record<BrandCategoryApi, string> = {
  APPAREL_AND_FASHION: "Apparel & Fashion",
  ELECTRONICS_AND_GADGETS: "Electronics & Gadgets",
  HEALTH_AND_BEAUTY: "Health & Beauty",
  FOOD_AND_BEVERAGES: "Food & Beverages",
  HOME_AND_LIFESTYLE: "Home & Lifestyle",
  SPORTS_AND_FITNESS: "Sports & Fitness",
  TOYS_AND_KIDS: "Toys & Kids",
  PETS_AND_ANIMALS: "Pets & Animals",
  AUTOMOBILE_AND_VEHICLES: "Automobile & Vehicles",
  REAL_ESTATE: "Real Estate",
  RESTAURANTS_AND_CAFES: "Restaurants & Cafes",
  CLINICS_AND_HEALTHCARE: "Clinics & Healthcare",
  SALONS_AND_PERSONAL_CARE: "Salons & Personal Care",
  EDUCATION_AND_COACHING: "Education & Coaching",
  TRAVEL_AND_HOSPITALITY: "Travel & Hospitality",
  LOCAL_BUSINESSES: "Local Businesses",
  SAAS_AND_APPS: "SaaS & Apps",
  PROFESSIONAL_SERVICES: "Professional Services",
  OTHER: "Other",
};

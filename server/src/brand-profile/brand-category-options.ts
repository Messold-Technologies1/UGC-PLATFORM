import { BrandCategory } from '@prisma/client';

export type BrandCategoryOption = { value: BrandCategory; label: string };


export const BRAND_CATEGORY_OPTIONS: ReadonlyArray<BrandCategoryOption> = [
  { value: BrandCategory.APPAREL_AND_FASHION, label: 'Apparel & Fashion' },
  { value: BrandCategory.ELECTRONICS_AND_GADGETS, label: 'Electronics & Gadgets' },
  { value: BrandCategory.HEALTH_AND_BEAUTY, label: 'Health & Beauty' },
  { value: BrandCategory.FOOD_AND_BEVERAGES, label: 'Food & Beverages' },
  { value: BrandCategory.HOME_AND_LIFESTYLE, label: 'Home & Lifestyle' },
  { value: BrandCategory.SPORTS_AND_FITNESS, label: 'Sports & Fitness' },
  { value: BrandCategory.TOYS_AND_KIDS, label: 'Toys & Kids' },
  { value: BrandCategory.PETS_AND_ANIMALS, label: 'Pets & Animals' },
  { value: BrandCategory.AUTOMOBILE_AND_VEHICLES, label: 'Automobile & Vehicles' },
  { value: BrandCategory.REAL_ESTATE, label: 'Real Estate' },
  { value: BrandCategory.RESTAURANTS_AND_CAFES, label: 'Restaurants & Cafes' },
  { value: BrandCategory.CLINICS_AND_HEALTHCARE, label: 'Clinics & Healthcare' },
  { value: BrandCategory.SALONS_AND_PERSONAL_CARE, label: 'Salons & Personal Care' },
  { value: BrandCategory.EDUCATION_AND_COACHING, label: 'Education & Coaching' },
  { value: BrandCategory.TRAVEL_AND_HOSPITALITY, label: 'Travel & Hospitality' },
  { value: BrandCategory.LOCAL_BUSINESSES, label: 'Local Businesses' },
  { value: BrandCategory.SAAS_AND_APPS, label: 'SaaS & Apps' },
  { value: BrandCategory.PROFESSIONAL_SERVICES, label: 'Professional Services' },
  { value: BrandCategory.OTHER, label: 'Other' },
];

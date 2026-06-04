import { z } from "zod";

export const MAX_LOGO_BYTES = 8 * 1024 * 1024;
export const LOGO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export const brandProductTypeValues = ["PHYSICAL", "DIGITAL", "BOTH"] as const;

export const brandCategoryValues = [
  "APPAREL_AND_FASHION",
  "ELECTRONICS_AND_GADGETS",
  "HEALTH_AND_BEAUTY",
  "FOOD_AND_BEVERAGES",
  "HOME_AND_LIFESTYLE",
  "SPORTS_AND_FITNESS",
  "TOYS_AND_KIDS",
  "PETS_AND_ANIMALS",
  "AUTOMOBILE_AND_VEHICLES",
  "REAL_ESTATE",
  "RESTAURANTS_AND_CAFES",
  "CLINICS_AND_HEALTHCARE",
  "SALONS_AND_PERSONAL_CARE",
  "EDUCATION_AND_COACHING",
  "TRAVEL_AND_HOSPITALITY",
  "LOCAL_BUSINESSES",
  "SAAS_AND_APPS",
  "PROFESSIONAL_SERVICES",
  "OTHER",
] as const;

export function normalizeOptionalString(raw: string): string | undefined {
  const t = raw.trim();
  return t ? t : undefined;
}

export function normalizeOptionalUrl(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

export const brandProfileUpdateSchema = z.object({
  contactFullName: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),
  brandName: z.string().trim().min(1, "Brand name is required"),
  brandPronunciation: z.string(),
  website: z
    .string()
    .refine(
      (value) => !value.trim() || Boolean(normalizeOptionalUrl(value)),
      "Website must be a valid http(s) URL",
    ),
  instagramUrl: z
    .string()
    .refine(
      (value) => !value.trim() || Boolean(normalizeOptionalUrl(value)),
      "Instagram URL must be a valid http(s) URL",
    ),
  productType: z.union([z.literal(""), z.enum(brandProductTypeValues)]),
  categories: z.array(z.enum(brandCategoryValues)),
  otherCategoryText: z.string(),
});

export type BrandProfileUpdateFormValues = z.infer<typeof brandProfileUpdateSchema>;

/** Shapes returned by `GET /api/creators` (Nest `CreatorsListResponseDto` + nested DTOs). */

export type CreatorProfileLanguageApi = {
  id: string;
  language: string;
};

/** Matches Nest `CreatorCategoryResponseDto`. */
export type CreatorProfileCategoryApi = {
  id: string;
  category: string;
};

export type CreatorProfilePackageApi = {
  id: string;
  name: string;
  deliverables: string[];
  priceAmount: string;
  deliveryDays: number;
};

export type CreatorProfilePersonaTagApi = {
  id: string;
  tag: string;
};

export type CreatorProfileRestrictionApi = {
  id: string;
  restriction: string;
};

/** Aligns with Nest `CreatorProfileResponseDto` / `GET /api/creators` list items. */
export type CreatorProfileItemApi = {
  id: string;
  userId: string;
  displayName: string;
  profileImageUrl?: string | null;
  city?: string | null;
  bio?: string | null;
  gender?: string | null;
  ageRange?: string | null;
  travelRadius?: number | null;
  onLocationAvailable?: boolean;
  onLocationFee?: string | null;
  languages: CreatorProfileLanguageApi[];
  categories: CreatorProfileCategoryApi[];
  personaTags?: CreatorProfilePersonaTagApi[];
  restrictions?: CreatorProfileRestrictionApi[];
  packages: CreatorProfilePackageApi[];
};

export type CreatorsListResponse = {
  items: CreatorProfileItemApi[];
  total: number;
  page: number;
  limit: number;
};

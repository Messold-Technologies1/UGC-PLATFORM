/** Shapes returned by `GET /api/creators` (Nest `CreatorsListResponseDto` + nested DTOs). */

export type CreatorProfileLanguageApi = {
  id: string;
  language: string;
};

export type CreatorProfileServiceApi = {
  id: string;
  serviceTypeId: string;
  serviceType: { id: string; name: string };
};

export type CreatorProfilePackageApi = {
  id: string;
  name: string;
  deliverables: string[];
  priceAmount: string;
  deliveryDays: number;
};

export type CreatorProfileItemApi = {
  id: string;
  userId: string;
  displayName: string;
  city?: string | null;
  bio?: string | null;
  gender?: string | null;
  ageRange?: string | null;
  travelRadius?: number | null;
  languages: CreatorProfileLanguageApi[];
  services: CreatorProfileServiceApi[];
  packages: CreatorProfilePackageApi[];
};

export type CreatorsListResponse = {
  items: CreatorProfileItemApi[];
  total: number;
  page: number;
  limit: number;
};

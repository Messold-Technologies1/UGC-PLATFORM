

export type CreatorProfileLanguageApi = {
  id: string;
  language: string;
};


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
  maxRevisions: number;
};

export type CreatorProfilePersonaTagApi = {
  id: string;
  tag: string;
};

export type CreatorProfileRestrictionApi = {
  id: string;
  restriction: string;
};

export type CreatorProfileAddOnApi = {
  id: string;
  name: string;
  priceAmount: string;
  description?: string | null;
};

export type CreatorPortfolioVideoPreviewApi = {
  id: string;
  creatorId: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  industryLabel?: string | null;
  tags: string[];
  createdAt: string;
};

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
  addOns?: CreatorProfileAddOnApi[];
  firstPortfolioVideo?: CreatorPortfolioVideoPreviewApi | null;
};

export type CreatorsListResponse = {
  items: CreatorProfileItemApi[];
  total: number;
  page: number;
  limit: number;
};

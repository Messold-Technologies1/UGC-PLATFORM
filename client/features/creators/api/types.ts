import type {
  CreatorContentVolumeBucket,
  CreatorGender,
  CreatorLanguageFluency,
} from "./create-creator-profile";
import type { CreatorFacetDimension } from "./get-creator-facet-options";

export type CreatorProfileCategoryApi = {
  id: string;
  category: string;
};

export type CreatorProfilePackageApi = {
  id: string;
  name: string;
  deliverables: string[];
  videoLengthSeconds: number;
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

export type CreatorProfileFacetSelectionApi = {
  id?: string;
  dimension: CreatorFacetDimension;
  slug: string;
  label: string;
};

export type CreatorProfileStructuredLanguageApi = {
  id?: string;
  slug: string;
  label: string;
  fluency: CreatorLanguageFluency;
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

export type CreatorPublicListPackageApi = {
  name: string;
  priceAmount: string;
  deliveryDays: number;
  basicEditing: boolean;
};

export type CreatorPublicListItemApi = {
  id: string;
  userId: string;
  name: string;
  profileImageUrl?: string | null;
  city?: string | null;
  countryName?: string | null;
  stateName?: string | null;
  bio?: string | null;
  gender?: CreatorGender | string | null;
  age?: number | null;
  contentVolume?: CreatorContentVolumeBucket | string | null;
  collaborationCount?: number;
  onLocationAvailable: boolean;
  languages: string[];
  profileLanguages?: CreatorProfileStructuredLanguageApi[];
  facetSelections?: CreatorProfileFacetSelectionApi[];
  categories: string[];
  personaTags: string[];
  restrictions: string[];
  packages: CreatorPublicListPackageApi[];
  portfolioVideos: CreatorPortfolioVideoPreviewApi[];
};

export type CreatorProfileItemApi = {
  id: string;
  userId: string;
  displayName: string;
  phone?: string | null;
  phoneVerified?: boolean;
  profileImageUrl?: string | null;
  city?: string | null;
  countryName?: string | null;
  stateName?: string | null;
  bio?: string | null;
  gender?: CreatorGender | string | null;
  dateOfBirth?: string | null;
  age?: number | null;
  ageGroup?: string | null;
  ageRange?: string | null;
  shippingAddress?: string | null;
  instagramUrl?: string | null;
  contentVolume?: CreatorContentVolumeBucket | string | null;
  collaborationCount?: number;
  travelRadius?: number | null;
  onLocationAvailable?: boolean;
  profileLanguages?: CreatorProfileStructuredLanguageApi[];
  facetSelections?: CreatorProfileFacetSelectionApi[];
  categories: CreatorProfileCategoryApi[];
  personaTags?: CreatorProfilePersonaTagApi[];
  restrictions?: CreatorProfileRestrictionApi[];
  packages: CreatorProfilePackageApi[];
  addOns?: CreatorProfileAddOnApi[];
  firstPortfolioVideo?: CreatorPortfolioVideoPreviewApi | null;
};

export type CreatorsListResponse = {
  items: CreatorPublicListItemApi[];
  total: number;
  page: number;
  limit: number;
};

export type CreatorPayoutDetailsMaskedApi = {
  configured: boolean;
  hasBankDetails?: boolean;
  accountNumberLast4?: string;
  ifsc?: string;
  accountHolderName?: string;
  hasUpi?: boolean;
  upiMasked?: string;
};

export type UpsertCreatorPayoutDetailsApi = {
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
};

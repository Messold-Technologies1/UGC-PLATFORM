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
  /** Promised delivery in days for Faster Delivery; null otherwise. */
  deliveryDays?: number | null;
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
  introVideoUrl?: string | null;
  city?: string | null;
  countryName?: string | null;
  stateName?: string | null;
  bio?: string | null;
  gender?: CreatorGender | string | null;
  age?: number | null;
  contentVolume?: CreatorContentVolumeBucket | string | null;
  collaborationCount?: number;
  avgRating?: string | null;
  reviewCount: number;
  completedOrders?: number;
  totalOrders?: number;
  onLocationAvailable: boolean;
  languages: string[];
  profileLanguages?: CreatorProfileStructuredLanguageApi[];
  facetSelections?: CreatorProfileFacetSelectionApi[];
  categories: string[];
  personaTags: string[];
  restrictions: string[];
  packages: CreatorPublicListPackageApi[];
  portfolioVideos: CreatorPortfolioVideoPreviewApi[];
  hasFasterDelivery?: boolean;
  fasterDeliveryDays?: number | null;
};

export type CreatorProfileItemApi = {
  id: string;
  userId: string;
  displayName: string;
  /** Unique public URL slug; may be absent until API migration is applied. */
  publicSlug?: string;
  phone?: string | null;
  phoneVerified?: boolean;
  profileImageUrl?: string | null;
  introVideoUrl?: string | null;
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
  contactEmail?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  snapchatUrl?: string | null;
  contentVolume?: CreatorContentVolumeBucket | string | null;
  collaborationCount?: number;
  avgRating?: string | null;
  reviewCount: number;
  totalOrders?: number;
  travelRadius?: number | null;
  onLocationAvailable?: boolean;
  profileLanguages?: CreatorProfileStructuredLanguageApi[];
  facetSelections?: CreatorProfileFacetSelectionApi[];
  categories: CreatorProfileCategoryApi[];
  personaTags?: CreatorProfilePersonaTagApi[];
  restrictions?: CreatorProfileRestrictionApi[];
  packages: CreatorProfilePackageApi[];
  addOns?: CreatorProfileAddOnApi[];
  timezone?: string | null;
  highlights?: string[];
  createdAt?: string;
  completedOrders?: number;
  totalEarnings?: number;
  responseRate?: number;
  topReviews?: CreatorRatingReviewApi[];
  /** One-way Go-Live latch: true once every requirement has been met. */
  completeProfile?: boolean;
  /** Discovery gate = approved AND completeProfile. */
  isListed?: boolean;
  whatsappNotificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
};

export type SuggestedCreatorContentCategoryApi = {
  slug: string;
  label: string;
};

export type SuggestedCreatorPortfolioVideoApi = {
  id: string;
  creatorId: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
};

export type SuggestedCreatorListItemApi = {
  id: string;
  creatorName: string;
  contentCategories: SuggestedCreatorContentCategoryApi[];
  priceAmount?: string | null;
  city?: string | null;
  firstPortfolioVideo?: SuggestedCreatorPortfolioVideoApi | null;
};

export type SuggestedCreatorsResponse = {
  items: SuggestedCreatorListItemApi[];
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

export type CreatorRatingReviewBrandSnapshotApi = {
  id: string;
  brandName: string;
  logoUrl?: string | null;
};

export type CreatorRatingReviewApi = {
  id: string;
  orderId: string;
  creatorId: string;
  rating: number;
  review?: string | null;
  packageNameSnapshot?: string | null;
  brand: CreatorRatingReviewBrandSnapshotApi;
  createdAt: string;
};

export type ListCreatorRatingReviewsResponse = {
  items: CreatorRatingReviewApi[];
  total: number;
  page: number;
  limit: number;
  avgRating?: string | null;
  reviewCount: number;
};

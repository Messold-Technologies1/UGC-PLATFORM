export interface WishlistCreatorPackage {
  name: string;
  priceAmount: string;
  deliveryDays: number;
  basicEditing?: boolean;
}

export interface WishlistCreatorPortfolioVideo {
  id: string;
  creatorId: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  industryLabel?: string | null;
  tags: string[];
}

export interface WishlistCreatorFacet {
  dimension: string;
  slug: string;
  label: string;
}

export interface WishlistCreator {
  id: string;
  name: string;
  profileImageUrl?: string | null;
  introVideoUrl?: string | null;
  city?: string | null;
  avgRating?: string | null;
  reviewCount?: number;
  languages?: string[];
  facetSelections?: WishlistCreatorFacet[];
  packages?: WishlistCreatorPackage[];
  portfolioVideos?: WishlistCreatorPortfolioVideo[];
}

export interface Wishlist {
  id: string;
  name: string;
  creatorCount: number;
  creatorIds: string[];
  shareEnabled: boolean;
  shareToken?: string | null;
  sharedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistDetail extends Wishlist {
  creators: WishlistCreator[];
}

export interface ListWishlistsResponse {
  items: Wishlist[];
}

export interface CreateWishlistResponse {
  id: string;
}

export interface WishlistShareResponse {
  shareEnabled: boolean;
  shareToken: string;
  sharedAt?: string | null;
}

export interface Wishlist {
  id: string;
  name: string;
  creatorCount: number;
  shareEnabled: boolean;
  shareToken?: string | null;
  sharedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistCreator {
  id: string;
  name: string;
  profileImageUrl?: string | null;
  introVideoUrl?: string | null;
  city?: string | null;
  avgRating?: string | null;
  reviewCount?: number;
  packages?: { name: string; priceAmount: string; deliveryDays: number }[];
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

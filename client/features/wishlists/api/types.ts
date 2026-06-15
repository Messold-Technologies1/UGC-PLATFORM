import type { CreatorPublicListItemApi } from "@/features/creators/api/types";

export type WishlistCreator = CreatorPublicListItemApi;

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

export interface PublicWishlistBrand {
  brandName: string;
  logoUrl?: string | null;
  contactFullName?: string | null;
}

export interface PublicWishlistResponse {
  id: string;
  name: string;
  sharedAt?: string | null;
  brand: PublicWishlistBrand;
  creators: WishlistCreator[];
}

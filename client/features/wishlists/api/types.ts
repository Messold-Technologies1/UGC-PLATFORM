import type { CreatorPublicListItemApi } from "@/features/creators/api/types";

export interface WishlistCreatorAddOn {
  id: string;
  name: string;
  priceAmount: string;
  description?: string | null;
  deliveryDays?: number | null;
}

/**
 * A wishlist creator, enriched by the wishlist detail endpoint with the
 * creator's available add-ons and the add-ons the brand pre-selected when
 * saving them. Used to drive the bulk-checkout modal.
 */
export type WishlistCreator = CreatorPublicListItemApi & {
  addOns?: WishlistCreatorAddOn[];
  selectedAddOnIds?: string[];
};

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
  brandName: string | null;
  logoUrl?: string | null;
  contactFullName?: string | null;
}

export interface PublicWishlistResponse {
  id: string;
  brandId: string;
  name: string;
  sharedAt?: string | null;
  brand: PublicWishlistBrand;
  creators: WishlistCreator[];
}

export interface ImportSharedWishlistResponse {
  wishlistId: string;
  addedCount: number;
  skippedCount: number;
}

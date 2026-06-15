import type { CreatorPublicListItemApi } from "@/features/creators/api/types";

export type WishlistApi = {
  id: string;
  name: string;
  creatorCount: number;
  shareEnabled: boolean;
  shareToken?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WishlistDetailApi = WishlistApi & {
  creators: CreatorPublicListItemApi[];
};

export type CreatorWishlistStatusItem = {
  id: string;
  name: string;
  creatorCount: number;
  saved: boolean;
};

export type CreatorWishlistStatusResponse = {
  items: CreatorWishlistStatusItem[];
};

export type ListWishlistsResponse = {
  items: WishlistApi[];
};

export type WishlistShareResponse = {
  shareEnabled: boolean;
  shareToken: string;
  sharedAt?: string | null;
};

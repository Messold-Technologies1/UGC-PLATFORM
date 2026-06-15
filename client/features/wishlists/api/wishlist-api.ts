import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  ListWishlistsResponse,
  WishlistApi,
  WishlistDetailApi,
  CreatorWishlistStatusResponse,
  WishlistShareResponse,
} from "./types";

export async function fetchWishlists(): Promise<ListWishlistsResponse> {
  const { data } = await api.get<ListWishlistsResponse>(ENDPOINTS.WISHLISTS.LIST);
  return data;
}

export async function createWishlist(params: {
  name: string;
  creatorIds?: string[];
}): Promise<WishlistApi> {
  const { data } = await api.post<WishlistApi>(ENDPOINTS.WISHLISTS.CREATE, params);
  return data;
}

export async function fetchWishlistDetail(
  wishlistId: string,
): Promise<WishlistDetailApi> {
  const { data } = await api.get<WishlistDetailApi>(
    ENDPOINTS.WISHLISTS.DETAIL(wishlistId),
  );
  return data;
}

export async function updateWishlist(
  wishlistId: string,
  params: { name?: string },
): Promise<WishlistApi> {
  const { data } = await api.patch<WishlistApi>(
    ENDPOINTS.WISHLISTS.UPDATE(wishlistId),
    params,
  );
  return data;
}

export async function deleteWishlist(wishlistId: string): Promise<void> {
  await api.delete(ENDPOINTS.WISHLISTS.DELETE(wishlistId));
}

export async function toggleCreatorInWishlist(
  wishlistId: string,
  creatorId: string,
): Promise<{ added: boolean }> {
  const { data } = await api.put<{ added: boolean }>(
    ENDPOINTS.WISHLISTS.TOGGLE_CREATOR(wishlistId, creatorId),
  );
  return data;
}

export async function fetchCreatorWishlistStatus(
  creatorId: string,
): Promise<CreatorWishlistStatusResponse> {
  const { data } = await api.get<CreatorWishlistStatusResponse>(
    ENDPOINTS.WISHLISTS.CREATOR_STATUS(creatorId),
  );
  return data;
}

export async function enableWishlistShare(
  wishlistId: string,
): Promise<WishlistShareResponse> {
  const { data } = await api.post<WishlistShareResponse>(
    ENDPOINTS.WISHLISTS.SHARE(wishlistId),
  );
  return data;
}

export async function disableWishlistShare(
  wishlistId: string,
): Promise<{ shareEnabled: boolean }> {
  const { data } = await api.delete<{ shareEnabled: boolean }>(
    ENDPOINTS.WISHLISTS.UNSHARE(wishlistId),
  );
  return data;
}

export async function fetchPublicWishlist(shareToken: string): Promise<{
  id: string;
  name: string;
  brand: { brandName: string; logoUrl?: string | null };
  creators: import("@/features/creators/api/types").CreatorPublicListItemApi[];
}> {
  const { data } = await api.get(ENDPOINTS.WISHLISTS.PUBLIC(shareToken));
  return data;
}

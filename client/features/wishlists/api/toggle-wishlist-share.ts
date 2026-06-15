import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { WishlistShareResponse } from "./types";

export async function toggleWishlistShare(wishlistId: string) {
  const { data } = await api.post<WishlistShareResponse>(ENDPOINTS.WISHLISTS.TOGGLE_SHARE(wishlistId));
  return data;
}

import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { WishlistShareResponse } from "./types";

export async function enableWishlistShare(wishlistId: string) {
  const { data } = await api.post<WishlistShareResponse>(ENDPOINTS.WISHLISTS.SHARE(wishlistId));
  return data;
}

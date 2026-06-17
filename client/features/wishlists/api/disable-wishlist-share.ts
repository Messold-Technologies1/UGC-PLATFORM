import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export async function disableWishlistShare(wishlistId: string) {
  const { data } = await api.delete<{ shareEnabled: boolean }>(ENDPOINTS.WISHLISTS.UNSHARE(wishlistId));
  return data;
}

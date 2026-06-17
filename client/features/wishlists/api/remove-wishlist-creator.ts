import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export async function removeWishlistCreator(wishlistId: string, creatorId: string) {
  await api.delete(ENDPOINTS.WISHLISTS.REMOVE_CREATOR(wishlistId, creatorId));
}

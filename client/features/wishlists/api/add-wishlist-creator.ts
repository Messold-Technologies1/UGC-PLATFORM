import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export async function addWishlistCreator(wishlistId: string, creatorId: string) {
  await api.post(ENDPOINTS.WISHLISTS.ADD_CREATOR(wishlistId), { creatorId });
}

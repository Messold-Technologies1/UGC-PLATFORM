import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export async function deleteWishlist(id: string) {
  await api.delete(ENDPOINTS.WISHLISTS.DELETE(id));
}

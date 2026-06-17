import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { WishlistDetail } from "./types";

export async function getWishlist(id: string) {
  const { data } = await api.get<WishlistDetail>(ENDPOINTS.WISHLISTS.DETAIL(id));
  return data;
}

import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { WishlistDetail } from "./types";

export async function updateWishlist(id: string, payload: { name?: string; creatorIds?: string[] }) {
  const { data } = await api.patch<WishlistDetail>(ENDPOINTS.WISHLISTS.UPDATE(id), payload);
  return data;
}

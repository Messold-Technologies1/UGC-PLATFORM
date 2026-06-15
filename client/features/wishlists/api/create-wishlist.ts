import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreateWishlistResponse } from "./types";

export async function createWishlist(payload: { name: string; creatorIds?: string[] }) {
  const { data } = await api.post<CreateWishlistResponse>(ENDPOINTS.WISHLISTS.CREATE, payload);
  return data;
}

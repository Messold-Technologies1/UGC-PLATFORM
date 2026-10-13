import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { getMetaBrowserIds } from "@/lib/meta-pixel";
import type { CreateWishlistResponse } from "./types";

export async function createWishlist(payload: { name: string; creatorIds?: string[] }) {
  // Only used when the wishlist is created around a creator — the server fires
  // one deduplicated AddToWishlist per seeded creator, none for an empty list.
  const { fbp, fbc } = getMetaBrowserIds();
  const { data } = await api.post<CreateWishlistResponse>(ENDPOINTS.WISHLISTS.CREATE, {
    ...payload,
    ...(fbp ? { metaFbp: fbp } : {}),
    ...(fbc ? { metaFbc: fbc } : {}),
  });
  return data;
}

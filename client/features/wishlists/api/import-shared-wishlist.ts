import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { ImportSharedWishlistResponse } from "./types";

export type ImportSharedWishlistPayload =
  | { wishlistId: string; name?: never }
  | { name: string; wishlistId?: never };

export async function importSharedWishlist(
  shareToken: string,
  payload: ImportSharedWishlistPayload,
) {
  const { data } = await api.post<ImportSharedWishlistResponse>(
    ENDPOINTS.WISHLISTS.IMPORT_SHARED(shareToken),
    payload,
  );
  return data;
}

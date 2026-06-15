import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { ListWishlistsResponse } from "./types";

export async function listWishlists() {
  const { data } = await api.get<ListWishlistsResponse>(ENDPOINTS.WISHLISTS.LIST);
  return data;
}

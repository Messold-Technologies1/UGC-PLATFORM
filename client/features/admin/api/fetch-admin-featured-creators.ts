import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AdminFeaturedCreatorsBoardDto } from "../types";

/** Featured creators as the same cards brands see, already in featured order. */
export async function fetchAdminFeaturedCreators(): Promise<AdminFeaturedCreatorsBoardDto> {
  const { data } = await api.get<AdminFeaturedCreatorsBoardDto>(
    ENDPOINTS.ADMIN.CREATORS.FEATURED_CARDS,
  );
  return data;
}

import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AdminFeaturedCreatorsBoardDto } from "../types";

/**
 * Save the order the admin dragged the cards into. Index 0 is the first card
 * brands and agencies see.
 */
export async function reorderFeaturedCreators(
  creatorIds: string[],
): Promise<AdminFeaturedCreatorsBoardDto> {
  const { data } = await api.patch<AdminFeaturedCreatorsBoardDto>(
    ENDPOINTS.ADMIN.CREATORS.FEATURED_ORDER,
    { creatorIds },
  );
  return data;
}

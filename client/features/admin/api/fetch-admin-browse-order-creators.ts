import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { mapProfileToListingCreator } from "@/features/creators/api/map-profile-to-creator";
import type { Creator } from "@/features/creators/types";
import type { AdminBrowseOrderListResponseDto } from "../types";

export type AdminBrowseOrderPage = {
  creators: Creator[];
  total: number;
  page: number;
  limit: number;
};

/**
 * One page of the browse board: the brand-facing cards, in the order brands
 * see them, carrying the creator's real name rather than the public slug the
 * brand card shows.
 */
export async function fetchAdminBrowseOrderCreators(
  page: number,
  limit: number,
  signal?: AbortSignal,
): Promise<AdminBrowseOrderPage> {
  const { data } = await api.get<AdminBrowseOrderListResponseDto>(
    ENDPOINTS.ADMIN.CREATORS.BROWSE_ORDER,
    { params: { page, limit }, signal },
  );

  return {
    creators: data.items.map((item) => ({
      ...mapProfileToListingCreator(item),
      // mapProfileToListingCreator reads `name`, which is the public slug.
      name: item.displayName,
    })),
    total: data.total,
    page: data.page,
    limit: data.limit,
  };
}

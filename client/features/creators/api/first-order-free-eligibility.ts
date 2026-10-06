import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

/**
 * Per-buyer "first order free" eligibility for a set of creators. The heavy
 * creators list is shared/cacheable and can't carry a per-buyer flag, so the
 * browse grid overlays it with this small authenticated call. Returns [] for
 * guests.
 */
export async function fetchFirstOrderFreeEligibility(
  creatorIds: string[],
): Promise<string[]> {
  if (creatorIds.length === 0) return [];
  const { data } = await api.post<{ eligibleCreatorIds: string[] }>(
    ENDPOINTS.CREATORS.FIRST_ORDER_FREE_ELIGIBLE,
    { creatorIds },
  );
  return data.eligibleCreatorIds ?? [];
}

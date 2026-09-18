import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

/**
 * Per-brand "first order free" eligibility for a set of creators. The heavy
 * creators list is shared/cacheable and can't carry a per-brand flag, so the
 * browse grid overlays it with this small, brand-scoped call (the axios client
 * attaches the active-brand header). Returns [] for guests.
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

import { env } from "@/lib/env";
import { ENDPOINTS } from "@/lib/endpoints";
import { mapProfileToListingCreator } from "./map-profile-to-creator";
import type { CreatorsListResponse } from "./types";
import type { CreatorsListResult } from "../hooks/use-creators-list-query";

/**
 * Server-side fetch of the first, unfiltered page of creators so the browse
 * page can hand it to `CreatorListing` as `initialData`. React Query then skips
 * the initial client request (the component only consumes it for page 1 with
 * default filters). Fail-open: any error returns null and the client fetches as
 * before. Cached for 60s to match the API's own list-cache TTL.
 */
export async function fetchInitialCreatorsList(
  limit: number,
): Promise<CreatorsListResult | null> {
  try {
    const url = `${env.apiUrl}${ENDPOINTS.CREATORS.LIST}?page=1&limit=${limit}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = (await res.json()) as CreatorsListResponse;
    return {
      creators: (data.items ?? []).map(mapProfileToListingCreator),
      total: data.total,
      page: data.page,
      limit: data.limit,
    };
  } catch {
    return null;
  }
}

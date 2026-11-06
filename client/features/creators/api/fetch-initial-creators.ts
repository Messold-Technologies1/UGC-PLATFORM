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
 * before. Cached for 60s, but tagged so admin actions can explicitly
 * invalidate it when featured ordering changes.
 *
 * Sends no cookies on purpose: the response is shared between viewers and
 * cached, so keying it to one person's session would serve their view to
 * everyone else. That makes it anonymous to the API, which is why it marks
 * itself as a prefetch — without the header every browse page load was
 * recorded as a signed-out visitor running an unfiltered search, which nobody
 * can actually do, and those rows were two thirds of the Filter insights page.
 */
export async function fetchInitialCreatorsList(
  limit: number,
): Promise<CreatorsListResult | null> {
  try {
    const url = `${env.apiUrl}${ENDPOINTS.CREATORS.LIST}?page=1&limit=${limit}`;
    const res = await fetch(url, {
      headers: { "x-gocollab-prefetch": "1" },
      next: { revalidate: 60, tags: ["creators-list"] },
    });
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

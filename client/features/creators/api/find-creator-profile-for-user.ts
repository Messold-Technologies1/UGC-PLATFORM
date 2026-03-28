import { fetchCreatorsPage } from "./list-creators";
import type { CreatorProfileItemApi } from "./types";

const PAGE_LIMIT = 50;

/**
 * Resolves the current user's creator profile id by scanning the public list.
 * Used client-side because `/auth/me` does not expose `creatorProfileId`.
 */
export async function findCreatorProfileForUserId(
  userId: string,
): Promise<CreatorProfileItemApi | null> {
  let page = 1;
  for (;;) {
    const res = await fetchCreatorsPage(page, PAGE_LIMIT);
    const found = res.items.find((p) => p.userId === userId);
    if (found) return found;
    if (page * PAGE_LIMIT >= res.total) return null;
    page += 1;
  }
}

import type { QueryClient } from "@tanstack/react-query";
import type { CreatorsListResult } from "@/features/creators/hooks/use-creators-list-query";

type InfinitePages = { pages: CreatorsListResult[]; pageParams: unknown[] };

function isInfinite(value: unknown): value is InfinitePages {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as InfinitePages).pages)
  );
}

function isSinglePage(value: unknown): value is CreatorsListResult {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as CreatorsListResult).creators)
  );
}

function applyToPage(
  page: CreatorsListResult,
  creatorId: string,
  delta: number,
): CreatorsListResult {
  let touched = false;
  const creators = page.creators.map((creator) => {
    if (creator.id !== creatorId) return creator;
    touched = true;
    return {
      ...creator,
      savedCount: Math.max(0, (creator.savedCount ?? 0) + delta),
    };
  });
  // Same array identity back when this page holds nobody we changed, so the
  // cards on it keep their memo and do not re-render.
  return touched ? { ...page, creators } : page;
}

/**
 * Move one creator's "times saved" in every cached browse list, by `delta`.
 *
 * The browse list is fetched once and held for five minutes, so a save made
 * during that window never reached the card: the heart filled (it reads the
 * wishlists query, which does invalidate) while the count beside it went on
 * reporting whatever the page was fetched with. Refetching the whole infinite
 * list to move one number would re-request every page the viewer has scrolled
 * through, so patch the cache in place instead.
 *
 * The count the server sends spans every brand and agency, and this only knows
 * about the viewer's own save — so it is a nudge in the right direction, not a
 * recount. The next genuine fetch replaces it with the server's figure.
 */
export function bumpCreatorSavedCount(
  queryClient: QueryClient,
  creatorId: string,
  delta: number,
): void {
  queryClient.setQueriesData(
    { queryKey: ["creators", "list"] },
    (current: unknown) => {
      if (isInfinite(current)) {
        const pages = current.pages.map((page) =>
          applyToPage(page, creatorId, delta),
        );
        return pages.some((page, i) => page !== current.pages[i])
          ? { ...current, pages }
          : current;
      }
      if (isSinglePage(current)) {
        return applyToPage(current, creatorId, delta);
      }
      return current;
    },
  );
}

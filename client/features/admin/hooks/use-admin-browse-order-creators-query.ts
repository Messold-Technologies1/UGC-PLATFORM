import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchAdminBrowseOrderCreators } from "../api/fetch-admin-browse-order-creators";

export const adminBrowseOrderCreatorsQueryKey = [
  "admin",
  "browse-order-cards",
] as const;

export function useAdminBrowseOrderCreatorsQuery(limit: number) {
  return useInfiniteQuery({
    queryKey: [...adminBrowseOrderCreatorsQueryKey, limit],
    queryFn: ({ pageParam, signal }) =>
      fetchAdminBrowseOrderCreators(pageParam, limit, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.limit < lastPage.total
        ? lastPage.page + 1
        : undefined,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

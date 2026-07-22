import { useQuery } from "@tanstack/react-query";
import { fetchAdminCreators } from "../api/fetch-admin-creators";
import { fetchFeaturedCreators } from "../api/fetch-featured-creators";
import type { AdminCreatorsListQueryDto } from "../types";

export const adminCreatorsQueryKey = (query: AdminCreatorsListQueryDto) => [
  "admin",
  "creators",
  query.segment,
  query.page ?? 1,
  query.limit ?? 20,
  query.search?.trim() || "",
];

export function useAdminCreatorsQuery(query: AdminCreatorsListQueryDto) {
  return useQuery({
    queryKey: adminCreatorsQueryKey(query),
    queryFn: () =>
      query.segment === "featured"
        ? fetchFeaturedCreators({
            page: query.page,
            limit: query.limit,
            search: query.search,
          })
        : fetchAdminCreators(query),
  });
}

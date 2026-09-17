import { useQuery } from "@tanstack/react-query";
import { fetchAdminCreators } from "../api/fetch-admin-creators";
import type { AdminCreatorsListQueryDto } from "../types";

export const adminCreatorsQueryKey = (query: AdminCreatorsListQueryDto) => [
  "admin",
  "creators",
  query.segment,
  query.page ?? 1,
  query.limit ?? 20,
  query.search?.trim() || "",
];

export function useAdminCreatorsQuery(
  query: AdminCreatorsListQueryDto,
  options?: { alwaysFresh?: boolean },
) {
  return useQuery({
    queryKey: adminCreatorsQueryKey(query),
    queryFn: () => fetchAdminCreators(query),
    // For control surfaces (e.g. the first-order-free toggle grid) always
    // re-check the server on mount so a change made elsewhere/on another
    // machine is never masked by the 60s default staleTime.
    ...(options?.alwaysFresh
      ? { staleTime: 0, refetchOnMount: "always" as const }
      : {}),
  });
}

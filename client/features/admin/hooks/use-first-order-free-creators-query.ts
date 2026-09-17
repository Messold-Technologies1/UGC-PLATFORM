import { useQuery } from "@tanstack/react-query";
import { fetchFirstOrderFreeCreators } from "../api/fetch-first-order-free-creators";
import type { FirstOrderFreeCreatorsQuery } from "../types";

export const firstOrderFreeCreatorsQueryKey = (
  query: FirstOrderFreeCreatorsQuery,
) => [
  "admin",
  "creators",
  "first-order-free",
  query.page ?? 1,
  query.limit ?? 12,
  query.search?.trim() || "",
];

export function useFirstOrderFreeCreatorsQuery(
  query: FirstOrderFreeCreatorsQuery,
) {
  return useQuery({
    queryKey: firstOrderFreeCreatorsQueryKey(query),
    queryFn: () => fetchFirstOrderFreeCreators(query),
    // A control surface: always re-check the server on open so a change made
    // elsewhere (or on another machine) is never masked by the default cache.
    staleTime: 0,
    refetchOnMount: "always",
  });
}

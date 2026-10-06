import { useQuery } from "@tanstack/react-query";
import { fetchAgencies } from "../api/fetch-agencies";
import type { AdminAgenciesQueryDto } from "../types";

export const agenciesQueryKey = (query?: AdminAgenciesQueryDto) => [
  "admin",
  "agencies",
  query,
] as const;

export function useAgenciesQuery(query?: AdminAgenciesQueryDto) {
  return useQuery({
    queryKey: agenciesQueryKey(query),
    queryFn: () => fetchAgencies(query),
    staleTime: 5 * 60_000,
  });
}

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { getBrief } from "../api/get-brief";
import type { Brief } from "../api/types";

export const briefDetailQueryKey = (id: string) => ["briefs", id] as const;

type UseGetBriefQueryOptions = Omit<
  UseQueryOptions<Brief, Error>,
  "queryKey" | "queryFn"
>;

export function useGetBriefQuery(
  id: string,
  options?: UseGetBriefQueryOptions,
) {
  return useQuery({
    ...options,
    queryKey: briefDetailQueryKey(id),
    queryFn: () => getBrief(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

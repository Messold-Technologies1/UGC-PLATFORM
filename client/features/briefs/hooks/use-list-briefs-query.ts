import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  listBriefs,
} from "../api/list-briefs";
import type { ListBriefsResponse } from "../api/types";

export const briefsQueryKey = ["briefs"] as const;

type UseListBriefsQueryOptions = Omit<
  UseQueryOptions<ListBriefsResponse, Error>,
  "queryKey" | "queryFn"
>;

export function useListBriefsQuery(options?: UseListBriefsQueryOptions) {
  return useQuery({
    ...options,
    queryKey: briefsQueryKey,
    queryFn: listBriefs,
  });
}

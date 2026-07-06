import { useQuery } from "@tanstack/react-query";
import {
  fetchPublicInstagramInsights,
  publicInstagramInsightsQueryKey,
  type PublicInstagramInsightsApi,
} from "../api/instagram-insights";

export function usePublicInstagramInsightsQuery(
  creatorId: string | undefined,
  options?: { enabled?: boolean; initialData?: PublicInstagramInsightsApi },
) {
  return useQuery({
    queryKey: publicInstagramInsightsQueryKey(creatorId ?? ""),
    queryFn: () => fetchPublicInstagramInsights(creatorId as string),
    enabled: Boolean(creatorId) && options?.enabled !== false,
    initialData: options?.initialData,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

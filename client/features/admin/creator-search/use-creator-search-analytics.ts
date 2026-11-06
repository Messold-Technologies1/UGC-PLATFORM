"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorSearchAnalytics, SearchAudience } from "./types";

export type CreatorSearchAnalyticsParams = {
  from?: string;
  to?: string;
  audience?: SearchAudience;
};

export const creatorSearchAnalyticsQueryKey = (
  params: CreatorSearchAnalyticsParams,
) => ["admin", "creator-search-analytics", params] as const;

export function useCreatorSearchAnalyticsQuery(
  params: CreatorSearchAnalyticsParams,
) {
  return useQuery({
    queryKey: creatorSearchAnalyticsQueryKey(params),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<CreatorSearchAnalytics>(
        ENDPOINTS.ADMIN.CREATOR_SEARCH.ANALYTICS,
        { params, signal },
      );
      return data;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

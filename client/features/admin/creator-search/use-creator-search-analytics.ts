"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  ActorSearchRow,
  CreatorSearchAnalytics,
  SearchAudience,
} from "./types";

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

export const creatorSearchActorsQueryKey = (params: {
  from?: string;
  to?: string;
}) => ["admin", "creator-search-actors", params] as const;

/**
 * Per-brand breakdown. `enabled` so the request only fires when the panel is
 * actually opened — most visits to this page never ask for it.
 */
export function useCreatorSearchActorsQuery(
  params: { from?: string; to?: string },
  enabled: boolean,
) {
  return useQuery({
    queryKey: creatorSearchActorsQueryKey(params),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<ActorSearchRow[]>(
        ENDPOINTS.ADMIN.CREATOR_SEARCH.ACTORS,
        { params, signal },
      );
      return data;
    },
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

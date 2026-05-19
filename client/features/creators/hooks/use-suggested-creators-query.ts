"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSuggestedCreators } from "../api/fetch-suggested-creators";

export const suggestedCreatorsQueryKey = (creatorId: string) =>
  ["creators", "suggested", creatorId] as const;

export function useSuggestedCreatorsQuery({
  creatorId,
  enabled = true,
}: {
  creatorId: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: suggestedCreatorsQueryKey(creatorId),
    queryFn: () => fetchSuggestedCreators(creatorId),
    enabled: enabled && Boolean(creatorId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

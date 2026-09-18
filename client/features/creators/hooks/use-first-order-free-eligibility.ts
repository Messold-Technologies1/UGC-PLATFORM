"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchFirstOrderFreeEligibility } from "../api/first-order-free-eligibility";

/**
 * Per-brand "first order free" eligibility for the given creators, as a Set for
 * O(1) card lookups. Kept out of the shared creators list so the flag is never
 * shared-cached: this brand-scoped call is layered on top of the browse grid.
 *
 * `staleTime: 0` + refetch on mount/focus means an admin toggling a creator
 * free is reflected the next time the brand opens or refocuses browse — no
 * websocket needed.
 */
export function useFirstOrderFreeEligibility(
  creatorIds: string[],
  enabled = true,
): Set<string> {
  // Stable key regardless of load order / duplicates across pages.
  const sortedIds = useMemo(
    () => [...new Set(creatorIds)].sort(),
    [creatorIds],
  );

  const { data } = useQuery({
    queryKey: ["creators", "first-order-free-eligible", sortedIds],
    queryFn: () => fetchFirstOrderFreeEligibility(sortedIds),
    enabled: enabled && sortedIds.length > 0,
    staleTime: 0,
    refetchOnMount: "always",
    retry: 1,
  });

  return useMemo(() => new Set(data ?? []), [data]);
}

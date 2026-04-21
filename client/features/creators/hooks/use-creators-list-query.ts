"use client";

import { useQuery } from "@tanstack/react-query";
import { mapProfileToListingCreator } from "../api/map-profile-to-creator";
import {
  fetchCreatorsPage,
  serializeCreatorListApiParams,
  type CreatorListApiFilters,
} from "../api/list-creators";
import type { Creator } from "../types";

export type CreatorsListResult = {
  creators: Creator[];
  total: number;
  page: number;
  limit: number;
};

export const creatorsListQueryKey = (filters?: CreatorListApiFilters) =>
  ["creators", "list", serializeCreatorListApiParams(filters)] as const;

export async function fetchCreatorsList(
  filters: CreatorListApiFilters = {},
): Promise<CreatorsListResult> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const data = await fetchCreatorsPage(page, limit, filters);

  return {
    creators: data.items.map(mapProfileToListingCreator),
    total: data.total,
    page: data.page,
    limit: data.limit,
  };
}

export function useCreatorsListQuery({
  filters,
  initialData,
  enabled,
}: {
  filters?: CreatorListApiFilters;
  initialData?: CreatorsListResult;
  enabled?: boolean;
} = {}) {
  return useQuery({
    queryKey: creatorsListQueryKey(filters),
    queryFn: () => fetchCreatorsList(filters),
    ...(initialData
      ? {
          initialData,
          refetchOnMount: false,
        }
      : {}),
    ...(enabled !== undefined ? { enabled } : {}),
    placeholderData: (previousData) => previousData,
    staleTime: initialData ? 5 * 60_000 : 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

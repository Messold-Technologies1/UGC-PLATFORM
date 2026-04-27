"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
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

function omitPageFilter(
  filters: CreatorListApiFilters = {},
): Omit<CreatorListApiFilters, "page"> {
  const next = { ...filters };
  delete next.page;
  return next;
}

export const infiniteCreatorsListQueryKey = (
  filters?: CreatorListApiFilters,
) => {
  const queryFilters = omitPageFilter(filters);
  return [
    "creators",
    "list",
    "infinite",
    serializeCreatorListApiParams(queryFilters),
  ] as const;
};

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

export function useInfiniteCreatorsListQuery({
  filters,
  initialData,
  enabled,
}: {
  filters?: CreatorListApiFilters;
  initialData?: CreatorsListResult;
  enabled?: boolean;
} = {}) {
  const queryFilters = omitPageFilter(filters);

  return useInfiniteQuery({
    queryKey: infiniteCreatorsListQueryKey(queryFilters),
    queryFn: ({ pageParam }) =>
      fetchCreatorsList({ ...queryFilters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const loadedThrough = lastPage.page * lastPage.limit;
      return loadedThrough < lastPage.total ? lastPage.page + 1 : undefined;
    },
    ...(initialData
      ? {
          initialData: {
            pages: [initialData],
            pageParams: [initialData.page],
          },
          refetchOnMount: false,
        }
      : {}),
    ...(enabled !== undefined ? { enabled } : {}),
    staleTime: initialData ? 5 * 60_000 : 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

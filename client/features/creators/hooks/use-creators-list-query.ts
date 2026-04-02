"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { mapProfileToListingCreator } from "../api/map-profile-to-creator";
import type { CreatorsListResponse } from "../api/types";
import type { Creator } from "../types";

export type CreatorsListResult = {
  creators: Creator[];
  total: number;
  page: number;
  limit: number;
};

export const creatorsListQueryKey = (page: number, limit: number) =>
  ["creators", "list", { page, limit }] as const;

export async function fetchCreatorsList(params: {
  page?: number;
  limit?: number;
}): Promise<CreatorsListResult> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const { data } = await api.get<CreatorsListResponse>(
    ENDPOINTS.CREATORS.LIST,
    {
      params: { page, limit },
    },
  );
  return {
    creators: data.items.map(mapProfileToListingCreator),
    total: data.total,
    page: data.page,
    limit: data.limit,
  };
}

export function useCreatorsListQuery(
  page = 1,
  limit = 20,
  initialData?: CreatorsListResult,
) {
  return useQuery({
    queryKey: creatorsListQueryKey(page, limit),
    queryFn: () => fetchCreatorsList({ page, limit }),
    ...(initialData
      ? {
          initialData,
          refetchOnMount: false,
        }
      : {}),
    staleTime: initialData ? 5 * 60_000 : 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

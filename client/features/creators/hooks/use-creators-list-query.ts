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

export const creatorsListQueryKey = () => ["creators", "list"] as const;

export async function fetchCreatorsList(): Promise<CreatorsListResult> {
  const { data } = await api.get<CreatorsListResponse>(
    ENDPOINTS.CREATORS.LIST,
  );
  return {
    creators: data.items.map(mapProfileToListingCreator),
    total: data.total,
    page: data.page,
    limit: data.limit,
  };
}

export function useCreatorsListQuery(initialData?: CreatorsListResult) {
  return useQuery({
    queryKey: creatorsListQueryKey(),
    queryFn: fetchCreatorsList,
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

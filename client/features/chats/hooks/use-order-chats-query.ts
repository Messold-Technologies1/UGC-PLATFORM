"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  fetchBrandChats,
  fetchCreatorChats,
  type BrandChatsListResponseDto,
  type CreatorChatsListResponseDto,
  type ListChatsParams,
} from "../api/order-chats";

export const orderChatsBaseQueryKey = ["chats"] as const;

export const brandChatsQueryKey = (page: number, limit: number) =>
  [...orderChatsBaseQueryKey, "brand", page, limit] as const;

export const creatorChatsQueryKey = (page: number, limit: number) =>
  [...orderChatsBaseQueryKey, "creator", page, limit] as const;

type UseBrandChatsQueryOptions = Omit<
  UseQueryOptions<BrandChatsListResponseDto, Error>,
  "queryKey" | "queryFn"
>;

type UseCreatorChatsQueryOptions = Omit<
  UseQueryOptions<CreatorChatsListResponseDto, Error>,
  "queryKey" | "queryFn"
>;

export function useBrandChatsQuery(
  params?: ListChatsParams,
  options?: UseBrandChatsQueryOptions,
) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery({
    ...options,
    queryKey: brandChatsQueryKey(page, limit),
    queryFn: () => fetchBrandChats({ page, limit }),
    staleTime: 30_000,
  });
}

export function useCreatorChatsQuery(
  params?: ListChatsParams,
  options?: UseCreatorChatsQueryOptions,
) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery({
    ...options,
    queryKey: creatorChatsQueryKey(page, limit),
    queryFn: () => fetchCreatorChats({ page, limit }),
    staleTime: 30_000,
  });
}

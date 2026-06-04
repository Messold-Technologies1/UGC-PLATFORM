"use client";

import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  fetchBrandChats,
  fetchCreatorChats,
  type BrandChatsListResponseDto,
  type CreatorChatsListResponseDto,
  type ListChatsParams,
} from "../api/order-chats";

export const orderChatsBaseQueryKey = ["chats"] as const;

export const CHATS_INBOX_PAGE_SIZE = 50;

export const brandChatsQueryKey = (page: number, limit: number) =>
  [...orderChatsBaseQueryKey, "brand", page, limit] as const;

export const creatorChatsQueryKey = (page: number, limit: number) =>
  [...orderChatsBaseQueryKey, "creator", page, limit] as const;

export const brandChatsInfiniteQueryKey = (limit: number) =>
  [...orderChatsBaseQueryKey, "brand", "infinite", limit] as const;

export const creatorChatsInfiniteQueryKey = (limit: number) =>
  [...orderChatsBaseQueryKey, "creator", "infinite", limit] as const;

function getNextChatsPage(lastPage: BrandChatsListResponseDto | CreatorChatsListResponseDto) {
  const loaded = lastPage.page * lastPage.limit;
  if (loaded >= lastPage.total) return undefined;
  return lastPage.page + 1;
}

export function flattenChatsInboxItems<T extends { items: unknown[] }>(
  data: InfiniteData<T> | undefined,
): T["items"] {
  return (data?.pages.flatMap((page) => page.items) ?? []) as T["items"];
}

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

type UseBrandChatsInfiniteQueryOptions = Omit<
  UseInfiniteQueryOptions<
    BrandChatsListResponseDto,
    Error,
    InfiniteData<BrandChatsListResponseDto>,
    ReturnType<typeof brandChatsInfiniteQueryKey>,
    number
  >,
  "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
>;

type UseCreatorChatsInfiniteQueryOptions = Omit<
  UseInfiniteQueryOptions<
    CreatorChatsListResponseDto,
    Error,
    InfiniteData<CreatorChatsListResponseDto>,
    ReturnType<typeof creatorChatsInfiniteQueryKey>,
    number
  >,
  "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
>;

export function useBrandChatsInfiniteQuery(
  limit: number = CHATS_INBOX_PAGE_SIZE,
  options?: UseBrandChatsInfiniteQueryOptions,
) {
  return useInfiniteQuery<
    BrandChatsListResponseDto,
    Error,
    InfiniteData<BrandChatsListResponseDto>,
    ReturnType<typeof brandChatsInfiniteQueryKey>,
    number
  >({
    ...options,
    queryKey: brandChatsInfiniteQueryKey(limit),
    queryFn: ({ pageParam }) => fetchBrandChats({ page: pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: getNextChatsPage,
    staleTime: 30_000,
  });
}

export function useCreatorChatsInfiniteQuery(
  limit: number = CHATS_INBOX_PAGE_SIZE,
  options?: UseCreatorChatsInfiniteQueryOptions,
) {
  return useInfiniteQuery<
    CreatorChatsListResponseDto,
    Error,
    InfiniteData<CreatorChatsListResponseDto>,
    ReturnType<typeof creatorChatsInfiniteQueryKey>,
    number
  >({
    ...options,
    queryKey: creatorChatsInfiniteQueryKey(limit),
    queryFn: ({ pageParam }) => fetchCreatorChats({ page: pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: getNextChatsPage,
    staleTime: 30_000,
  });
}

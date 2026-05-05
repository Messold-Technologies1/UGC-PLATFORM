import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  fetchAdminOrderChatMessages,
  fetchAdminOrderChatState,
} from "../api/fetch-admin-order-chat";

const DEFAULT_CHAT_MESSAGES_LIMIT = 20;

export const adminOrderChatMessagesQueryKey = (
  orderId: string,
  limit = DEFAULT_CHAT_MESSAGES_LIMIT,
) => ["admin", "orders", orderId, "chat", "messages", { limit }] as const;

export const adminOrderChatStateQueryKey = (orderId: string) =>
  ["admin", "orders", orderId, "chat", "state"] as const;

export function useAdminOrderChatMessagesInfiniteQuery(
  orderId: string,
  limit = DEFAULT_CHAT_MESSAGES_LIMIT,
) {
  return useInfiniteQuery({
    queryKey: adminOrderChatMessagesQueryKey(orderId, limit),
    queryFn: ({ pageParam }) =>
      fetchAdminOrderChatMessages(orderId, {
        limit,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(orderId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useAdminOrderChatStateQuery(orderId: string) {
  return useQuery({
    queryKey: adminOrderChatStateQueryKey(orderId),
    queryFn: () => fetchAdminOrderChatState(orderId),
    enabled: Boolean(orderId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

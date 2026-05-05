"use client";

import { useEffect, useRef } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { getSocket } from "@/lib/socket";
import type {
  OrderChatMessageEvent,
  OrderChatReadUpdatedEvent,
} from "@/lib/realtime-events";
import {
  fetchOrderChatMessages,
  fetchOrderChatState,
  markOrderChatRead,
  sendOrderChatMessage,
  type MarkOrderChatReadPayload,
  type OrderChatMessageDto,
  type OrderChatMessagesResponseDto,
  type OrderChatReadReceiptDto,
  type OrderChatStateDto,
  type SendOrderChatMessagePayload,
} from "../api/order-chat";

const DEFAULT_CHAT_MESSAGES_LIMIT = 20;

type OrderChatMessagesInfiniteData = InfiniteData<
  OrderChatMessagesResponseDto,
  string | undefined
>;

export const orderChatMessagesBaseQueryKey = (orderId: string) =>
  ["orders", orderId, "chat", "messages"] as const;

export const orderChatMessagesQueryKey = (
  orderId: string,
  limit = DEFAULT_CHAT_MESSAGES_LIMIT,
) => [...orderChatMessagesBaseQueryKey(orderId), { limit }] as const;

export const orderChatStateQueryKey = (orderId: string) =>
  ["orders", orderId, "chat", "state"] as const;

function sortMessagesAscending(
  first: OrderChatMessageDto,
  second: OrderChatMessageDto,
) {
  const firstDate = new Date(first.createdAt).getTime();
  const secondDate = new Date(second.createdAt).getTime();

  if (firstDate !== secondDate) {
    return firstDate - secondDate;
  }

  return first.id.localeCompare(second.id);
}

function mergeMessageIntoInfiniteData(
  data: OrderChatMessagesInfiniteData | undefined,
  message: OrderChatMessageDto,
): OrderChatMessagesInfiniteData | undefined {
  if (!data) {
    return {
      pages: [{ items: [message] }],
      pageParams: [undefined],
    };
  }

  const pages = data.pages.length
    ? data.pages.map((page) => ({
        ...page,
        items: page.items.filter(
          (item) =>
            item.id !== message.id &&
            !(
              message.clientMessageId &&
              item.clientMessageId === message.clientMessageId
            ),
        ),
      }))
    : [{ items: [] }];

  return {
    ...data,
    pages: [
      {
        ...pages[0],
        items: [message, ...pages[0].items],
      },
      ...pages.slice(1),
    ],
  };
}

function markOptimisticMessageFailed(
  data: OrderChatMessagesInfiniteData | undefined,
  clientMessageId?: string,
): OrderChatMessagesInfiniteData | undefined {
  if (!data || !clientMessageId) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.clientMessageId === clientMessageId
          ? { ...item, deliveryStatus: "failed" }
          : item,
      ),
    })),
  };
}

function mergeMessagesIntoCache(
  queryClient: QueryClient,
  orderId: string,
  messages: OrderChatMessageDto[],
) {
  if (!messages.length) return;

  queryClient.setQueriesData<OrderChatMessagesInfiniteData>(
    { queryKey: orderChatMessagesBaseQueryKey(orderId) },
    (current) =>
      messages.reduce(
        (next, message) => mergeMessageIntoInfiniteData(next, message),
        current,
      ),
  );
}

function applyReadReceiptToState(
  state: OrderChatStateDto | undefined,
  receipt: OrderChatReadReceiptDto | OrderChatReadUpdatedEvent,
): OrderChatStateDto | undefined {
  if (!state || state.orderId !== receipt.orderId) return state;

  if (receipt.userId === state.brandUserId) {
    return {
      ...state,
      brandLastReadMessageId: receipt.lastReadMessageId ?? undefined,
      brandLastReadAt: receipt.lastReadAt ?? undefined,
    };
  }

  if (receipt.userId === state.creatorUserId) {
    return {
      ...state,
      creatorLastReadMessageId: receipt.lastReadMessageId ?? undefined,
      creatorLastReadAt: receipt.lastReadAt ?? undefined,
    };
  }

  return state;
}

function updateReadStateCache(
  queryClient: QueryClient,
  orderId: string,
  receipt: OrderChatReadReceiptDto | OrderChatReadUpdatedEvent,
) {
  queryClient.setQueryData<OrderChatStateDto>(
    orderChatStateQueryKey(orderId),
    (current) => applyReadReceiptToState(current, receipt),
  );
}

export function getSortedOrderChatMessages(
  pages: OrderChatMessagesResponseDto[] | undefined,
) {
  const byId = new Map<string, OrderChatMessageDto>();

  for (const page of pages ?? []) {
    for (const message of page.items) {
      byId.set(message.id, message);
    }
  }

  return Array.from(byId.values()).sort(sortMessagesAscending);
}

export function useOrderChatMessagesInfiniteQuery(
  orderId: string,
  limit = DEFAULT_CHAT_MESSAGES_LIMIT,
) {
  return useInfiniteQuery({
    queryKey: orderChatMessagesQueryKey(orderId, limit),
    queryFn: ({ pageParam }) =>
      fetchOrderChatMessages(orderId, {
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

export function useOrderChatStateQuery(orderId: string) {
  return useQuery({
    queryKey: orderChatStateQueryKey(orderId),
    queryFn: () => fetchOrderChatState(orderId),
    enabled: Boolean(orderId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useSendOrderChatMessageMutation(
  orderId: string,
  senderUserId?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SendOrderChatMessagePayload) =>
      sendOrderChatMessage(orderId, payload),
    onMutate: async (payload) => {
      void queryClient.cancelQueries({
        queryKey: orderChatMessagesBaseQueryKey(orderId),
      });

      if (!senderUserId) {
        return { clientMessageId: payload.clientMessageId };
      }

      const clientMessageId =
        payload.clientMessageId ?? `local-${Date.now().toString(36)}`;

      mergeMessagesIntoCache(queryClient, orderId, [
        {
          id: `local-${clientMessageId}`,
          orderId,
          senderUserId,
          text: payload.text.trim(),
          clientMessageId,
          createdAt: new Date().toISOString(),
          deliveryStatus: "sending",
        },
      ]);

      return { clientMessageId };
    },
    onSuccess: (message) => {
      mergeMessagesIntoCache(queryClient, orderId, [message]);
    },
    onError: (_error, _payload, context) => {
      queryClient.setQueriesData<OrderChatMessagesInfiniteData>(
        { queryKey: orderChatMessagesBaseQueryKey(orderId) },
        (current) =>
          markOptimisticMessageFailed(current, context?.clientMessageId),
      );
    },
  });
}

export function useMarkOrderChatReadMutation(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MarkOrderChatReadPayload) =>
      markOrderChatRead(orderId, payload),
    onSuccess: (receipt) => {
      updateReadStateCache(queryClient, orderId, receipt);
    },
  });
}

export function useOrderChatRealtime(
  orderId: string,
  latestMessageCreatedAt?: string,
) {
  const queryClient = useQueryClient();
  const latestCreatedAtRef = useRef<string | undefined>(latestMessageCreatedAt);

  useEffect(() => {
    latestCreatedAtRef.current = latestMessageCreatedAt;
  }, [latestMessageCreatedAt]);

  useEffect(() => {
    if (!orderId) return;

    const socket = getSocket();
    const connectedOnMount = socket.connected;
    const hasConnectedRef = { current: connectedOnMount };

    const catchUpMessages = async () => {
      const after = latestCreatedAtRef.current;
      if (!after) return;

      try {
        const response = await fetchOrderChatMessages(orderId, {
          after,
          limit: 50,
        });
        mergeMessagesIntoCache(queryClient, orderId, response.items);
      } catch {
      }
    };

    const onConnect = () => {
      if (!hasConnectedRef.current) {
        hasConnectedRef.current = true;
        return;
      }

      void catchUpMessages();
    };

    const onMessage = (event: OrderChatMessageEvent) => {
      if (event.orderId !== orderId) return;
      mergeMessagesIntoCache(queryClient, orderId, [event.message]);
    };

    const onReadUpdated = (event: OrderChatReadUpdatedEvent) => {
      if (event.orderId !== orderId) return;
      updateReadStateCache(queryClient, orderId, event);
    };

    socket.on("connect", onConnect);
    socket.on("chat.message", onMessage);
    socket.on("chat.read_updated", onReadUpdated);

    return () => {
      socket.off("connect", onConnect);
      socket.off("chat.message", onMessage);
      socket.off("chat.read_updated", onReadUpdated);
    };
  }, [orderId, queryClient]);
}

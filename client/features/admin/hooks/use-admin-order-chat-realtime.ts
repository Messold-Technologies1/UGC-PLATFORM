"use client";

import { useEffect } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket";
import type {
  OrderChatMessageEvent,
  OrderChatReadUpdatedEvent,
} from "@/lib/realtime-events";
import type {
  OrderChatMessageDto,
  OrderChatMessagesResponseDto,
} from "../types";
import {
  adminOrderChatMessagesQueryKey,
  adminOrderChatStateQueryKey,
} from "./use-admin-order-chat";

type AdminMessagesCache = InfiniteData<OrderChatMessagesResponseDto>;

function mergeMessage(
  cache: AdminMessagesCache | undefined,
  message: OrderChatMessageDto,
): AdminMessagesCache | undefined {
  if (!cache || cache.pages.length === 0) return cache;

  const alreadyPresent = cache.pages.some((page) =>
    page.items.some((item) => item.id === message.id),
  );
  if (alreadyPresent) return cache;

  const [firstPage, ...restPages] = cache.pages;
  const updatedFirstPage: OrderChatMessagesResponseDto = {
    ...firstPage,
    items: [message, ...firstPage.items],
  };

  return {
    ...cache,
    pages: [updatedFirstPage, ...restPages],
  };
}

/**
 * Keeps the admin dispute group chat live: joins the order's realtime room and
 * merges brand/creator/support messages into the admin message cache as they
 * arrive, so the admin sees replies without refreshing.
 */
export function useAdminOrderChatRealtime(orderId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orderId) return;

    const socket = getSocket();

    const subscribe = () => {
      socket.emit("order-chat:subscribe", { orderId });
    };

    if (socket.connected) subscribe();

    const onConnect = () => {
      subscribe();
      // Re-sync anything missed while the socket was down.
      void queryClient.invalidateQueries({
        queryKey: adminOrderChatMessagesQueryKey(orderId),
      });
    };

    const onMessage = (event: OrderChatMessageEvent) => {
      if (event.orderId !== orderId) return;
      queryClient.setQueryData<AdminMessagesCache>(
        adminOrderChatMessagesQueryKey(orderId),
        (cache) => mergeMessage(cache, event.message),
      );
    };

    const onReadUpdated = (event: OrderChatReadUpdatedEvent) => {
      if (event.orderId !== orderId) return;
      void queryClient.invalidateQueries({
        queryKey: adminOrderChatStateQueryKey(orderId),
      });
    };

    socket.on("connect", onConnect);
    socket.on("chat.message", onMessage);
    socket.on("chat.read_updated", onReadUpdated);

    return () => {
      socket.emit("order-chat:unsubscribe", { orderId });
      socket.off("connect", onConnect);
      socket.off("chat.message", onMessage);
      socket.off("chat.read_updated", onReadUpdated);
    };
  }, [orderId, queryClient]);
}

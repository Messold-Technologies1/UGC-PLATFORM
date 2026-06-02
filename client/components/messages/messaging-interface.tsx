"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, MessageSquare } from "lucide-react";
import {
  MessagingConversation,
  type MessagingConversationMessage,
  type MessagingParticipant,
} from "@/components/messaging-conversation";
import { ChatRulesFooter } from "./chat-rules-footer";
import { ChatSidebarRight } from "./chat-sidebar-right";
import {
  ConversationList,
  type MessageListConversation,
} from "./conversation-list";
import type {
  BrandChatListItemDto,
  ChatLastMessageDto,
  CreatorChatListItemDto,
} from "@/features/chats/api/order-chats";
import {
  useBrandChatsQuery,
  useCreatorChatsQuery,
} from "@/features/chats/hooks/use-order-chats-query";
import type {
  OrderBrandSnapshot,
  OrderCreatorSnapshot,
} from "@/features/orders/api/types";
import {
  fetchOrderChatMessages,
  fetchOrderChatState,
  markOrderChatRead,
  type OrderChatMessageDto,
  type OrderChatMessagesResponseDto,
  type OrderChatStateDto,
} from "@/features/orders/api/order-chat";
import {
  getSortedOrderChatMessages,
  orderChatMessagesQueryKey,
  orderChatStateQueryKey,
  useSendOrderChatMessageMutation,
  useSendOrderChatVoiceMessageMutation,
} from "@/features/orders/hooks/use-order-chat";
import { orderChatsBaseQueryKey } from "@/features/chats/hooks/use-order-chats-query";
import { useAuth } from "@/providers/auth-provider";
import { getSocket } from "@/lib/socket";
import type {
  OrderChatMessageEvent,
  OrderChatReadUpdatedEvent,
} from "@/lib/realtime-events";
import { cn } from "@/lib/utils";

interface MessagingInterfaceProps {
  role: "brand" | "creator";
}

type ChatOrderSummary = {
  id: string;
  status: string;
  packageNameSnapshot: string;
  updatedAt: string;
};

type OrderThread = {
  id: string;
  name: string;
  avatarText: string;
  avatarUrl?: string | null;
  avatarColor: string;
  status: string;
  subtitle?: string;
  lastMessage: string;
  lastMessageTime: string;
  latestActivityAt: string;
  unreadCount: number;
  order: ChatOrderSummary;
  brand?: OrderBrandSnapshot;
  creator?: OrderCreatorSnapshot;
  isChatLocked: boolean;
};

type UserConversation = MessageListConversation & {
  threads: OrderThread[];
  brand?: OrderBrandSnapshot;
  creator?: OrderCreatorSnapshot;
  activeOrderId: string;
  activeOrder?: ChatOrderSummary;
  isChatLocked: boolean;
};

const AVATAR_COLORS = [
  "bg-emerald-500 text-white",
  "bg-indigo-500 text-white",
  "bg-rose-500 text-white",
  "bg-amber-500 text-white",
  "bg-cyan-600 text-white",
  "bg-slate-800 text-white",
];

function createClientMessageId() {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `chat-${Date.now()}-${random}`;
}

function initials(value: string) {
  return (
    value
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function colorForId(id: string) {
  const total = Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_COLORS[total % AVATAR_COLORS.length];
}

function shortOrderId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function formatLastMessage(
  lastMessage: ChatLastMessageDto | undefined,
  packageName: string,
  orderId: string,
) {
  if (!lastMessage) {
    return `${packageName} • Order #${shortOrderId(orderId)}`;
  }

  if (lastMessage.type === "VOICE") {
    return "Voice message";
  }

  return lastMessage.previewText?.trim() || "Message";
}

function formatConversationTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  return new Intl.DateTimeFormat("en-US", {
    month: isToday ? undefined : "short",
    day: isToday ? undefined : "numeric",
    hour: isToday ? "2-digit" : undefined,
    minute: isToday ? "2-digit" : undefined,
  }).format(date);
}

function mapBrandChat(item: BrandChatListItemDto): OrderThread {
  const name = item.creator.displayName || "Creator";

  return {
    id: item.orderId,
    name,
    avatarText: initials(name),
    avatarUrl: null,
    avatarColor: colorForId(item.creator.id),
    status: item.status,
    subtitle: item.packageName,
    lastMessage: formatLastMessage(item.lastMessage, item.packageName, item.orderId),
    lastMessageTime: formatConversationTime(
      item.lastMessage?.createdAt ?? item.updatedAt,
    ),
    latestActivityAt: item.lastMessage?.createdAt ?? item.updatedAt,
    unreadCount: item.unreadCount,
    order: {
      id: item.orderId,
      status: item.status,
      packageNameSnapshot: item.packageName,
      updatedAt: item.updatedAt,
    },
    creator: {
      id: item.creator.id,
      displayName: item.creator.displayName,
      city: item.creator.city,
    },
    isChatLocked: item.isChatLocked,
  };
}

function mapCreatorChat(item: CreatorChatListItemDto): OrderThread {
  const name = item.brand.brandName || "Brand";

  return {
    id: item.orderId,
    name,
    avatarText: initials(name),
    avatarUrl: item.brand.logoUrl,
    avatarColor: colorForId(item.brand.id),
    status: item.status,
    subtitle: item.packageName,
    lastMessage: formatLastMessage(item.lastMessage, item.packageName, item.orderId),
    lastMessageTime: formatConversationTime(
      item.lastMessage?.createdAt ?? item.updatedAt,
    ),
    latestActivityAt: item.lastMessage?.createdAt ?? item.updatedAt,
    unreadCount: item.unreadCount,
    order: {
      id: item.orderId,
      status: item.status,
      packageNameSnapshot: item.packageName,
      updatedAt: item.updatedAt,
    },
    brand: item.brand,
    isChatLocked: item.isChatLocked,
  };
}

function timestamp(value: string) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function buildUserConversations(
  threads: OrderThread[],
  role: "brand" | "creator",
): UserConversation[] {
  const byCounterparty = new Map<string, OrderThread[]>();

  for (const thread of threads) {
    const counterpartyId =
      role === "brand" ? thread.creator?.id : thread.brand?.id;
    if (!counterpartyId) continue;

    const key = `${role === "brand" ? "creator" : "brand"}:${counterpartyId}`;
    byCounterparty.set(key, [...(byCounterparty.get(key) ?? []), thread]);
  }

  return Array.from(byCounterparty.entries())
    .map(([id, groupThreads]) => {
      const sortedThreads = [...groupThreads].sort(
        (first, second) =>
          timestamp(second.latestActivityAt) - timestamp(first.latestActivityAt),
      );
      const latestThread = sortedThreads[0];
      const activeThread =
        sortedThreads.find((thread) => !thread.isChatLocked) ?? latestThread;

      return {
        id,
        name: latestThread.name,
        avatarText: latestThread.avatarText,
        avatarUrl: latestThread.avatarUrl,
        avatarColor: latestThread.avatarColor,
        status: latestThread.status,
        subtitle:
          sortedThreads.length > 1
            ? `${sortedThreads.length} order chats`
            : latestThread.subtitle,
        lastMessage: latestThread.lastMessage,
        lastMessageTime: latestThread.lastMessageTime,
        unreadCount: sortedThreads.reduce(
          (total, thread) => total + thread.unreadCount,
          0,
        ),
        threads: sortedThreads,
        brand: latestThread.brand,
        creator: latestThread.creator,
        activeOrderId: activeThread.order.id,
        activeOrder: activeThread.order,
        isChatLocked: sortedThreads.every((thread) => thread.isChatLocked),
      };
    })
    .sort(
      (first, second) =>
        timestamp(second.threads[0]?.latestActivityAt ?? "") -
        timestamp(first.threads[0]?.latestActivityAt ?? ""),
    );
}

function isMessageReadByOther(
  message: MessagingConversationMessage,
  otherLastReadAt?: string,
) {
  if (!message.createdAt || !otherLastReadAt) return false;

  const messageDate = new Date(message.createdAt).getTime();
  const readDate = new Date(otherLastReadAt).getTime();

  if (Number.isNaN(messageDate) || Number.isNaN(readDate)) return false;
  return messageDate <= readDate;
}

const GROUPED_CHAT_MESSAGES_LIMIT = 50;

function sortChatMessagesAscending(
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

function ActiveUserConversation({
  conversation,
  role,
  onBack,
}: {
  conversation: UserConversation;
  role: "brand" | "creator";
  onBack: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orderIds = useMemo(
    () => conversation.threads.map((thread) => thread.order.id),
    [conversation.threads],
  );
  const activeThread =
    conversation.threads.find(
      (thread) => thread.order.id === conversation.activeOrderId,
    ) ?? conversation.threads[0];
  const activeOrderId = activeThread?.order.id ?? "";

  const stateQueries = useQueries({
    queries: orderIds.map((orderId) => ({
      queryKey: orderChatStateQueryKey(orderId),
      queryFn: () => fetchOrderChatState(orderId),
      enabled: Boolean(orderId),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    })),
  });

  const messageQueries = useQueries({
    queries: orderIds.map((orderId) => ({
      queryKey: orderChatMessagesQueryKey(orderId, GROUPED_CHAT_MESSAGES_LIMIT),
      queryFn: () =>
        fetchOrderChatMessages(orderId, {
          limit: GROUPED_CHAT_MESSAGES_LIMIT,
        }),
      enabled: Boolean(orderId),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    })),
  });

  const stateByOrderId = useMemo(() => {
    const map = new Map<string, OrderChatStateDto>();

    stateQueries.forEach((query, index) => {
      if (query.data) {
        map.set(orderIds[index], query.data as OrderChatStateDto);
      }
    });

    return map;
  }, [orderIds, stateQueries]);

  const rawMessages = useMemo(() => {
    const byId = new Map<string, OrderChatMessageDto>();

    messageQueries.forEach((query) => {
      const data = query.data as OrderChatMessagesResponseDto | undefined;
      for (const message of getSortedOrderChatMessages(
        data ? [data] : undefined,
      )) {
        byId.set(message.id, message);
      }
    });

    return Array.from(byId.values()).sort(sortChatMessagesAscending);
  }, [messageQueries]);

  const activeState = activeOrderId
    ? stateByOrderId.get(activeOrderId)
    : undefined;
  const firstState = stateQueries.find((query) => query.data)?.data as
    | OrderChatStateDto
    | undefined;
  const state = activeState ?? firstState;

  const activeOrder = activeThread?.order ?? conversation.activeOrder;
  const viewerUserId = state
    ? role === "brand"
      ? state.brandUserId
      : state.creatorUserId
    : undefined;
  const sendMessageMutation = useSendOrderChatMessageMutation(
    activeOrderId,
    viewerUserId,
  );
  const sendVoiceMessageMutation = useSendOrderChatVoiceMessageMutation(
    activeOrderId,
    viewerUserId,
  );

  const latestPersistedMessagesByOrderId = useMemo(() => {
    const map = new Map<string, OrderChatMessageDto>();

    for (const message of rawMessages) {
      if (!message.deliveryStatus) {
        map.set(message.orderId, message);
      }
    }

    return map;
  }, [rawMessages]);

  const latestCreatedAtByOrderId = useMemo(() => {
    const map = new Map<string, string>();

    latestPersistedMessagesByOrderId.forEach((message, orderId) => {
      map.set(orderId, message.createdAt);
    });

    return map;
  }, [latestPersistedMessagesByOrderId]);
  const latestCreatedAtByOrderIdRef = useRef(latestCreatedAtByOrderId);
  const lastReadAttemptRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    latestCreatedAtByOrderIdRef.current = latestCreatedAtByOrderId;
  }, [latestCreatedAtByOrderId]);

  useEffect(() => {
    lastReadAttemptRef.current = new Set();
  }, [conversation.id]);

  useEffect(() => {
    if (!orderIds.length) return;

    const matchingOrderIds = new Set(orderIds);
    const socket = getSocket();
    const connectedOnMount = socket.connected;
    const hasConnectedRef = { current: connectedOnMount };

    const catchUpMessages = async () => {
      const pairs = Array.from(latestCreatedAtByOrderIdRef.current.entries());
      if (!pairs.length) return;

      await Promise.all(
        pairs.map(async ([orderId, after]) => {
          try {
            await queryClient.invalidateQueries({
              queryKey: orderChatMessagesQueryKey(
                orderId,
                GROUPED_CHAT_MESSAGES_LIMIT,
              ),
            });
            const response = await fetchOrderChatMessages(orderId, {
              after,
              limit: GROUPED_CHAT_MESSAGES_LIMIT,
            });
            if (response.items.length > 0) {
              await queryClient.invalidateQueries({
                queryKey: orderChatMessagesQueryKey(
                  orderId,
                  GROUPED_CHAT_MESSAGES_LIMIT,
                ),
              });
            }
          } catch {
          }
        }),
      );
    };

    const onConnect = () => {
      if (!hasConnectedRef.current) {
        hasConnectedRef.current = true;
        return;
      }

      void catchUpMessages();
    };

    const onMessage = (event: OrderChatMessageEvent) => {
      if (!matchingOrderIds.has(event.orderId)) return;
      void queryClient.invalidateQueries({
        queryKey: orderChatMessagesQueryKey(
          event.orderId,
          GROUPED_CHAT_MESSAGES_LIMIT,
        ),
      });
      void queryClient.invalidateQueries({ queryKey: orderChatsBaseQueryKey });
    };

    const onReadUpdated = (event: OrderChatReadUpdatedEvent) => {
      if (!matchingOrderIds.has(event.orderId)) return;
      void queryClient.invalidateQueries({
        queryKey: orderChatStateQueryKey(event.orderId),
      });
      void queryClient.invalidateQueries({ queryKey: orderChatsBaseQueryKey });
    };

    socket.on("connect", onConnect);
    socket.on("chat.message", onMessage);
    socket.on("chat.read_updated", onReadUpdated);

    return () => {
      socket.off("connect", onConnect);
      socket.off("chat.message", onMessage);
      socket.off("chat.read_updated", onReadUpdated);
    };
  }, [orderIds, queryClient]);

  useEffect(() => {
    if (!viewerUserId) return;

    latestPersistedMessagesByOrderId.forEach((message, orderId) => {
      const readState = stateByOrderId.get(orderId);
      if (!readState) return;

      const viewerLastReadMessageId =
        role === "brand"
          ? readState.brandLastReadMessageId
          : readState.creatorLastReadMessageId;
      const key = `${orderId}:${message.id}`;

      if (viewerLastReadMessageId === message.id) return;
      if (lastReadAttemptRef.current.has(key)) return;

      lastReadAttemptRef.current.add(key);
      void markOrderChatRead(orderId, {
        lastReadMessageId: message.id,
      }).then(() => {
        void queryClient.invalidateQueries({
          queryKey: orderChatStateQueryKey(orderId),
        });
        void queryClient.invalidateQueries({ queryKey: orderChatsBaseQueryKey });
      });
    });
  }, [
    latestPersistedMessagesByOrderId,
    queryClient,
    role,
    stateByOrderId,
    viewerUserId,
  ]);

  const isLoading =
    stateQueries.some((query) => query.isPending) ||
    messageQueries.some((query) => query.isPending);
  const errorMessage =
    stateQueries.find((query) => query.error)?.error?.message ||
    messageQueries.find((query) => query.error)?.error?.message ||
    "Please try again in a moment.";

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-5 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading conversation</p>
        </div>
      </div>
    );
  }

  if (
    stateQueries.some((query) => query.isError) ||
    messageQueries.some((query) => query.isError) ||
    !state ||
    !viewerUserId ||
    !activeOrderId
  ) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="flex max-w-sm flex-col items-center gap-3">
          <div className="rounded-2xl bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Unable to load chat
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {errorMessage}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const brandName =
    conversation.brand?.brandName ?? (role === "brand" ? user?.name : null);
  const creatorName =
    conversation.creator?.displayName ??
    (role === "creator" ? user?.name : null);
  const participants: MessagingParticipant[] = [
    {
      id: state.brandUserId,
      name: brandName ?? "Brand",
      avatar: conversation.brand?.logoUrl,
      roleLabel: "Brand",
    },
    {
      id: state.creatorUserId,
      name: creatorName ?? "Creator",
      avatar: conversation.creator?.profileImageUrl,
      roleLabel: "Creator",
    },
  ];
  const otherParticipant = role === "brand" ? participants[1] : participants[0];

  const latestReadOutgoingMessageIdByOrderId = new Map<string, string>();

  for (const message of rawMessages) {
    const readState = stateByOrderId.get(message.orderId);
    if (!readState || message.senderUserId !== viewerUserId) continue;

    const otherLastReadAt =
      role === "brand" ? readState.creatorLastReadAt : readState.brandLastReadAt;
    if (isMessageReadByOther(message, otherLastReadAt)) {
      latestReadOutgoingMessageIdByOrderId.set(message.orderId, message.id);
    }
  }

  const messages = rawMessages.map((message) => {
    const mapped: MessagingConversationMessage = {
      id: message.id,
      type: message.type,
      text: message.text,
      audioUrl: message.audioUrl,
      audioDurationMs: message.audioDurationMs,
      audioMimeType: message.audioMimeType,
      senderUserId: message.senderUserId,
      createdAt: message.createdAt,
    };

    if (message.deliveryStatus === "sending") {
      mapped.statusLabel = "Sending";
      return mapped;
    }

    if (message.deliveryStatus === "failed") {
      mapped.statusLabel = "Failed";
      return mapped;
    }

    if (
      message.id === latestReadOutgoingMessageIdByOrderId.get(message.orderId) &&
      message.senderUserId === viewerUserId
    ) {
      mapped.statusLabel = "Read";
    }

    return mapped;
  });

  function handleSendMessage(text: string) {
    sendMessageMutation.mutate({
      text,
      clientMessageId: createClientMessageId(),
    });
  }

  async function handleSendVoiceMessage({
    blob,
    audioDurationMs,
    contentType,
  }: {
    blob: Blob;
    audioDurationMs: number;
    contentType: string;
  }) {
    await sendVoiceMessageMutation.mutateAsync({
      blob,
      audioDurationMs,
      contentType,
      clientMessageId: createClientMessageId(),
    });
  }

  return (
    <MessagingConversation
      alignRightUserId={viewerUserId}
      className="h-full rounded-none border-0 bg-transparent shadow-none"
      emptyState="No chat messages yet."
      headerAvatarUrl={otherParticipant.avatar}
      headerSubtitle={
        conversation.threads.length > 1
          ? `${conversation.threads.length} order chats • ${activeOrder?.packageNameSnapshot ?? "Order chat"}`
          : `${activeOrder?.packageNameSnapshot ?? "Order chat"} • Order #${shortOrderId(activeOrderId)}`
      }
      headerTitle={otherParticipant.name}
      inputPlaceholder="Message about this order..."
      messages={messages}
      onBack={onBack}
      onSendMessage={conversation.isChatLocked ? undefined : handleSendMessage}
      onSendVoiceMessage={
        conversation.isChatLocked ? undefined : handleSendVoiceMessage
      }
      participants={participants}
      readOnly={conversation.isChatLocked}
      sendError={
        sendMessageMutation.error?.message ||
        sendVoiceMessageMutation.error?.message
      }
    />
  );
}

function MessagingInterfaceContent({
  initialOrderId,
  role,
}: MessagingInterfaceProps & { initialOrderId: string | null }) {
  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(initialOrderId);

  const brandChatsQuery = useBrandChatsQuery(
    { page: 1, limit: 50 },
    { enabled: role === "brand" },
  );
  const creatorChatsQuery = useCreatorChatsQuery(
    { page: 1, limit: 50 },
    { enabled: role === "creator" },
  );

  const conversations = useMemo(() => {
    const threads =
      role === "brand"
        ? (brandChatsQuery.data?.items ?? []).map(mapBrandChat)
        : (creatorChatsQuery.data?.items ?? []).map(mapCreatorChat);

    return buildUserConversations(threads, role);
  }, [brandChatsQuery.data?.items, creatorChatsQuery.data?.items, role]);

  const selectedConversation = selectedConversationId
    ? conversations.find(
        (conversation) =>
          conversation.id === selectedConversationId ||
          conversation.threads.some(
            (thread) => thread.order.id === selectedConversationId,
          ),
      )
    : null;
  const activeConversation = selectedConversation ?? conversations[0] ?? null;
  const activeConversationId = activeConversation?.id ?? null;
  const isLoading =
    role === "brand" ? brandChatsQuery.isPending : creatorChatsQuery.isPending;
  const error =
    role === "brand" ? brandChatsQuery.error : creatorChatsQuery.error;

  return (
    <div className="w-full px-4 py-4 sm:px-6 md:px-8 md:py-6 flex flex-col">
      <div className="flex gap-6">
        <div className="flex min-w-0 flex-1 flex-col pr-2">
          <div className="relative flex h-[calc(100vh-200px)] min-h-[500px] max-h-[800px] min-w-0 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-background shadow-xl shadow-slate-200/40 dark:shadow-none">
            <div
              className={cn(
                "h-full w-full shrink-0 md:w-[350px] lg:w-[400px]",
                selectedConversationId ? "hidden md:block" : "block",
              )}
            >
              <ConversationList
                conversations={conversations}
                error={error?.message ?? null}
                isLoading={isLoading}
                onSelect={setSelectedConversationId}
                selectedId={activeConversationId}
              />
            </div>

            <div className="hidden w-px shrink-0 bg-border/50 md:block" />

            <div
              className={cn(
                "h-full min-w-0 flex-1 bg-slate-50/80 dark:bg-slate-900/80 relative",
                selectedConversationId ? "block" : "hidden md:block",
              )}
            >
              {activeConversation ? (
                <ActiveUserConversation
                  conversation={activeConversation}
                  onBack={() => setSelectedConversationId(null)}
                  role={role}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
                  <MessageSquare className="size-12 opacity-20" />
                  <p className="text-sm font-medium">Select a conversation</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 shrink-0">
            <ChatRulesFooter />
          </div>
        </div>

        <ChatSidebarRight />
      </div>
    </div>
  );
}

function MessagingInterfaceInner(props: MessagingInterfaceProps) {
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("orderId");

  return (
    <MessagingInterfaceContent
      {...props}
      key={orderIdParam ?? "inbox"}
      initialOrderId={orderIdParam}
    />
  );
}

export function MessagingInterface(props: MessagingInterfaceProps) {
  return (
    <Suspense fallback={
      <div className="flex h-[500px] w-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    }>
      <MessagingInterfaceInner {...props} />
    </Suspense>
  );
}

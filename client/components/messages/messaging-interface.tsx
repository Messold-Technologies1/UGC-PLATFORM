"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, MessageSquare } from "lucide-react";
import {
  MessagingConversation,
  type MessageDeliveryStatus,
  type MessagingConversationMessage,
  type MessagingParticipant,
} from "@/components/messaging-conversation";

type OutgoingChatMessage = MessagingConversationMessage & {
  deliveryStatus?: MessageDeliveryStatus;
};
import { ChatRulesFooter } from "./chat-rules-footer";
import { ChatSidebarRight } from "./chat-sidebar-right";
import {
  ConversationList,
  type MessageListConversation,
} from "./conversation-list";
import {
  formatChatInboxPreview,
  type BrandChatListItemDto,
  type CreatorChatListItemDto,
} from "@/features/chats/api/order-chats";
import {
  CHATS_INBOX_PAGE_SIZE,
  flattenChatsInboxItems,
  useBrandChatsInfiniteQuery,
  useCreatorChatsInfiniteQuery,
} from "@/features/chats/hooks/use-order-chats-query";
import type {
  OrderBrandSnapshot,
  OrderCreatorSnapshot,
} from "@/features/orders/api/types";
import {
  getSortedOrderChatMessages,
  useMarkOrderChatReadMutation,
  useOrderChatMessagesInfiniteQuery,
  useOrderChatRealtime,
  useOrderChatStateQuery,
  useSendOrderChatMessageMutation,
  useSendOrderChatVoiceMessageMutation,
} from "@/features/orders/hooks/use-order-chat";
import { useAuth } from "@/providers/auth-provider";
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

type OrderConversation = MessageListConversation & {
  order: ChatOrderSummary;
  brand?: OrderBrandSnapshot;
  creator?: OrderCreatorSnapshot;
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
  const total = Array.from(id).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  return AVATAR_COLORS[total % AVATAR_COLORS.length];
}

function shortOrderId(id: string) {
  return id.slice(0, 8).toUpperCase();
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

function mapBrandChat(
  item: BrandChatListItemDto,
  viewerUserId?: string,
): OrderConversation {
  const name = item.creator.displayName || "Creator";

  return {
    id: item.orderId,
    name,
    avatarText: initials(name),
    avatarUrl: null,
    avatarColor: colorForId(item.creator.id),
    status: item.status,
    subtitle: `Order #${shortOrderId(item.orderId)}`,
    lastMessage: formatChatInboxPreview(item.lastMessage, { viewerUserId }),
    lastMessageTime: formatConversationTime(
      item.lastMessage?.createdAt ?? item.updatedAt,
    ),
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
    isChatLocked:
      item.isChatLocked ||
      ["COMPLETED", "CANCELLED", "EXPIRED", "REFUNDED"].includes(
        item.status.toUpperCase(),
      ),
  };
}

function mapCreatorChat(
  item: CreatorChatListItemDto,
  viewerUserId?: string,
): OrderConversation {
  const name = item.brand.brandName || "Brand";

  return {
    id: item.orderId,
    name,
    avatarText: initials(name),
    avatarUrl: item.brand.logoUrl,
    avatarColor: colorForId(item.brand.id),
    status: item.status,
    subtitle: `Order #${shortOrderId(item.orderId)}`,
    lastMessage: formatChatInboxPreview(item.lastMessage, { viewerUserId }),
    lastMessageTime: formatConversationTime(
      item.lastMessage?.createdAt ?? item.updatedAt,
    ),
    unreadCount: item.unreadCount,
    order: {
      id: item.orderId,
      status: item.status,
      packageNameSnapshot: item.packageName,
      updatedAt: item.updatedAt,
    },
    brand: item.brand,
    isChatLocked:
      item.isChatLocked ||
      ["COMPLETED", "CANCELLED", "EXPIRED", "REFUNDED"].includes(
        item.status.toUpperCase(),
      ),
  };
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

function ActiveOrderConversation({
  conversation,
  role,
  onBack,
}: {
  conversation: OrderConversation;
  role: "brand" | "creator";
  onBack: () => void;
}) {
  const { user } = useAuth();
  const orderId = conversation.order.id;
  const stateQuery = useOrderChatStateQuery(orderId);
  const messagesQuery = useOrderChatMessagesInfiniteQuery(orderId);
  const markReadMutation = useMarkOrderChatReadMutation(orderId);
  const lastReadAttemptRef = useRef<string | null>(null);

  const state = stateQuery.data;
  const rawMessages = useMemo(
    () => getSortedOrderChatMessages(messagesQuery.data?.pages),
    [messagesQuery.data?.pages],
  );

  const viewerUserId = state
    ? role === "brand"
      ? state.brandUserId
      : state.creatorUserId
    : undefined;
  const viewerLastReadMessageId = state
    ? role === "brand"
      ? state.brandLastReadMessageId
      : state.creatorLastReadMessageId
    : undefined;
  const otherLastReadAt = state
    ? role === "brand"
      ? state.creatorLastReadAt
      : state.brandLastReadAt
    : undefined;
  const sendMessageMutation = useSendOrderChatMessageMutation(
    orderId,
    viewerUserId,
  );
  const sendVoiceMessageMutation = useSendOrderChatVoiceMessageMutation(
    orderId,
    viewerUserId,
  );

  const latestPersistedMessage = rawMessages
    .filter((message) => !message.deliveryStatus)
    .at(-1);

  useOrderChatRealtime(orderId, latestPersistedMessage?.createdAt);

  useEffect(() => {
    lastReadAttemptRef.current = null;
  }, [orderId]);

  useEffect(() => {
    if (!latestPersistedMessage || !viewerUserId) return;
    if (viewerLastReadMessageId === latestPersistedMessage.id) return;
    if (lastReadAttemptRef.current === latestPersistedMessage.id) return;
    if (markReadMutation.isPending) return;

    lastReadAttemptRef.current = latestPersistedMessage.id;
    markReadMutation.mutate({ lastReadMessageId: latestPersistedMessage.id });
  }, [
    latestPersistedMessage,
    markReadMutation,
    viewerLastReadMessageId,
    viewerUserId,
  ]);

  if (stateQuery.isPending || messagesQuery.isPending) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-5 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading conversation</p>
        </div>
      </div>
    );
  }

  if (stateQuery.isError || messagesQuery.isError || !state || !viewerUserId) {
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
              {stateQuery.error?.message ||
                messagesQuery.error?.message ||
                "Please try again in a moment."}
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
  // Any sender that is neither the brand nor the creator is platform Support
  // (an admin who joined while the order was disputed). Surface them as a
  // labelled participant so the thread reads as the brand ↔ creator ↔ support
  // group chat — and it stays that way after the dispute is resolved and the
  // order returns to its previous (or cancelled) state.
  const knownParticipantIds = new Set([
    state.brandUserId,
    state.creatorUserId,
  ]);
  const supportSenderIds = Array.from(
    new Set(
      rawMessages
        .map((message) => message.senderUserId)
        .filter((id) => id && !knownParticipantIds.has(id)),
    ),
  );
  for (const supportId of supportSenderIds) {
    participants.push({
      id: supportId,
      name: "Support",
      roleLabel: "Support",
    });
  }
  const hasSupport = supportSenderIds.length > 0;

  const otherParticipant = role === "brand" ? participants[1] : participants[0];

  const messages: OutgoingChatMessage[] = rawMessages.map((message) => {
    const mapped: OutgoingChatMessage = {
      id: message.id,
      type: message.type,
      text: message.text,
      audioUrl: message.audioUrl,
      audioDurationMs: message.audioDurationMs,
      audioMimeType: message.audioMimeType,
      senderUserId: message.senderUserId,
      createdAt: message.createdAt,
    };

    if (message.senderUserId !== viewerUserId) return mapped;

    if (message.deliveryStatus === "sending") {
      return { ...mapped, deliveryStatus: "sending" };
    }

    if (message.deliveryStatus === "failed") {
      return { ...mapped, deliveryStatus: "failed" };
    }

    if (isMessageReadByOther(message, otherLastReadAt)) {
      return { ...mapped, deliveryStatus: "read" };
    }

    return { ...mapped, deliveryStatus: "sent" };
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
      hasMoreMessages={messagesQuery.hasNextPage}
      headerAvatarUrl={otherParticipant.avatar}
      headerSubtitle={
        hasSupport
          ? `${otherParticipant.name} • Order #${shortOrderId(orderId)}`
          : `${conversation.order.packageNameSnapshot} • Order #${shortOrderId(orderId)}`
      }
      headerTitle={hasSupport ? "Dispute Chat" : otherParticipant.name}
      inputPlaceholder="Message about this order..."
      isLoadingMore={messagesQuery.isFetchingNextPage}
      messages={messages}
      onBack={onBack}
      onLoadMore={
        messagesQuery.hasNextPage
          ? () => {
              void messagesQuery.fetchNextPage();
            }
          : undefined
      }
      onSendMessage={handleSendMessage}
      onSendVoiceMessage={handleSendVoiceMessage}
      participants={participants}
      readOnly={conversation.isChatLocked}
      sendError={
        sendMessageMutation.error?.message ||
        sendVoiceMessageMutation.error?.message
      }
      showSenderNames={hasSupport}
    />
  );
}

function MessagingInterfaceContent({
  initialOrderId,
  role,
}: MessagingInterfaceProps & { initialOrderId: string | null }) {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(initialOrderId);
  const [inboxTab, setInboxTab] = useState<"all" | "unread">("all");

  const brandChatsQuery = useBrandChatsInfiniteQuery(CHATS_INBOX_PAGE_SIZE, {
    enabled: role === "brand",
  });
  const creatorChatsQuery = useCreatorChatsInfiniteQuery(
    CHATS_INBOX_PAGE_SIZE,
    {
      enabled: role === "creator",
    },
  );

  const conversations = useMemo(() => {
    const viewerUserId = user?.id;

    if (role === "brand") {
      const items = flattenChatsInboxItems(brandChatsQuery.data);
      return items.map((item) => mapBrandChat(item, viewerUserId));
    }

    const items = flattenChatsInboxItems(creatorChatsQuery.data);
    return items.map((item) => mapCreatorChat(item, viewerUserId));
  }, [brandChatsQuery.data, creatorChatsQuery.data, role, user?.id]);

  const selectedConversationExists = selectedConversationId
    ? conversations.some(
        (conversation) => conversation.id === selectedConversationId,
      )
    : false;
  const listSelectedId =
    inboxTab === "unread"
      ? selectedConversationId
      : selectedConversationExists
        ? selectedConversationId
        : (conversations[0]?.id ?? null);
  const selectedConversation =
    listSelectedId != null
      ? (conversations.find(
          (conversation) => conversation.id === listSelectedId,
        ) ?? null)
      : null;
  const activeChatsQuery =
    role === "brand" ? brandChatsQuery : creatorChatsQuery;
  const isLoading = activeChatsQuery.isPending;
  const error = activeChatsQuery.error;
  const hasMoreChats = activeChatsQuery.hasNextPage;
  const isLoadingMoreChats = activeChatsQuery.isFetchingNextPage;

  const handleLoadMoreChats = () => {
    if (!activeChatsQuery.hasNextPage || activeChatsQuery.isFetchingNextPage) {
      return;
    }
    void activeChatsQuery.fetchNextPage();
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 md:py-5 flex flex-col">
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
                hasMore={hasMoreChats}
                isLoading={isLoading}
                isLoadingMore={isLoadingMoreChats}
                onInboxTabChange={setInboxTab}
                onLoadMore={handleLoadMoreChats}
                onSelect={setSelectedConversationId}
                selectedId={listSelectedId}
              />
            </div>

            <div className="hidden w-px shrink-0 bg-border/50 md:block" />

            <div
              className={cn(
                "h-full min-w-0 flex-1 bg-slate-50/80 dark:bg-slate-900/80 relative",
                selectedConversationId ? "block" : "hidden md:block",
              )}
            >
              {selectedConversation ? (
                <ActiveOrderConversation
                  conversation={selectedConversation}
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
    <Suspense
      fallback={
        <div className="flex h-[500px] w-full items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <MessagingInterfaceInner {...props} />
    </Suspense>
  );
}

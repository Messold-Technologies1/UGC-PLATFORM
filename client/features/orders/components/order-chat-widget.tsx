"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  MessagingConversation,
  type MessagingConversationMessage,
  type MessagingParticipant,
} from "@/components/messaging-conversation";
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

type OrderChatWidgetProps = {
  orderId: string;
  role: "brand" | "creator";
  brand?: OrderBrandSnapshot;
  creator?: OrderCreatorSnapshot;
  className?: string;
  headerTitle?: string;
  headerSubtitle?: string | null;
  hideHeaderAvatar?: boolean;
};

function createClientMessageId() {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `chat-${Date.now()}-${random}`;
}

function OrderChatShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex h-160 items-center justify-center rounded-3xl border bg-card p-6 text-center shadow-sm",
        className,
      )}
    >
      {children}
    </section>
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

export function OrderChatWidget({
  orderId,
  role,
  brand,
  creator,
  className,
  headerTitle,
  headerSubtitle,
  hideHeaderAvatar,
}: OrderChatWidgetProps) {
  const { user } = useAuth();
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

  const isInitialLoading = stateQuery.isPending || messagesQuery.isPending;
  const errorMessage =
    stateQuery.error?.message ||
    messagesQuery.error?.message ||
    "Unable to load the order chat.";

  if (isInitialLoading) {
    return (
      <OrderChatShell className={className}>
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading order chat</p>
        </div>
      </OrderChatShell>
    );
  }

  if (stateQuery.isError || messagesQuery.isError || !state || !viewerUserId) {
    return (
      <OrderChatShell className={className}>
        <div className="flex max-w-md flex-col items-center gap-3">
          <div className="rounded-2xl bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-headline text-lg font-bold">
              Unable to load chat
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {errorMessage}
            </p>
          </div>
        </div>
      </OrderChatShell>
    );
  }

  const brandName = brand?.brandName ?? (role === "brand" ? user?.name : null);
  const creatorName =
    creator?.displayName ?? (role === "creator" ? user?.name : null);
  const participants: MessagingParticipant[] = [
    {
      id: state.brandUserId,
      name: brandName ?? "Brand",
      avatar: brand?.logoUrl,
      roleLabel: "Brand",
    },
    {
      id: state.creatorUserId,
      name: creatorName ?? "Creator",
      avatar: creator?.profileImageUrl,
      roleLabel: "Creator",
    },
  ];
  const otherParticipant =
    role === "brand" ? participants[1] : participants[0];

  const latestReadOutgoingMessageId = rawMessages
    .filter(
      (message) =>
        message.senderUserId === viewerUserId &&
        isMessageReadByOther(message, otherLastReadAt),
    )
    .at(-1)?.id;

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
      message.id === latestReadOutgoingMessageId &&
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
      className={className}
      emptyState="No chat messages yet."
      hasMoreMessages={messagesQuery.hasNextPage}
      headerAvatarUrl={otherParticipant.avatar}
      headerSubtitle={headerSubtitle !== undefined ? headerSubtitle : "Order chat"}
      headerTitle={headerTitle ?? otherParticipant.name}
      hideHeaderAvatar={hideHeaderAvatar}
      inputPlaceholder="Message about this order..."
      isLoadingMore={messagesQuery.isFetchingNextPage}
      messages={messages}
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
      sendError={
        sendMessageMutation.error?.message ||
        sendVoiceMessageMutation.error?.message
      }
    />
  );
}

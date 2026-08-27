"use client";

import { useState, type ReactNode } from "react";
import { AlertCircle, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MessagingConversation,
  type MessagingConversationMessage,
  type MessagingParticipant,
} from "@/components/messaging-conversation";
import type {
  OrderBrandSnapshot,
  OrderCreatorSnapshot,
} from "@/features/orders/api/types";
import { cn } from "@/lib/utils";
import { useMeQuery } from "@/features/auth/hooks/use-me-query";
import {
  useAdminOrderChatMessagesInfiniteQuery,
  useAdminOrderChatStateQuery,
} from "../hooks/use-admin-order-chat";
import { useAdminOrderChatRealtime } from "../hooks/use-admin-order-chat-realtime";
import { useSendAdminOrderChatMessageMutation } from "../hooks/use-send-admin-order-chat-message";
import type { OrderChatMessageDto } from "../types";

type AdminOrderChatProps = {
  orderId: string;
  brand: OrderBrandSnapshot;
  creator: OrderCreatorSnapshot;
  orderStatus: string;
  className?: string;
};

function compareChatMessages(
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

function mapMessages(
  pages: OrderChatMessageDto[][],
): MessagingConversationMessage[] {
  const byId = new Map<string, OrderChatMessageDto>();

  for (const page of pages) {
    for (const message of page) {
      byId.set(message.id, message);
    }
  }

  return Array.from(byId.values()).sort(compareChatMessages).map((message) => ({
    id: message.id,
    type: message.type,
    text: message.text,
    audioUrl: message.audioUrl,
    audioDurationMs: message.audioDurationMs,
    audioMimeType: message.audioMimeType,
    senderUserId: message.senderUserId,
    createdAt: message.createdAt,
  }));
}

function AdminOrderChatShell({
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

export function AdminOrderChat({
  orderId,
  brand,
  creator,
  orderStatus,
  className,
}: AdminOrderChatProps) {
  const stateQuery = useAdminOrderChatStateQuery(orderId);
  const messagesQuery = useAdminOrderChatMessagesInfiniteQuery(orderId);
  const meQuery = useMeQuery();
  const sendMutation = useSendAdminOrderChatMessageMutation(orderId);
  useAdminOrderChatRealtime(orderId);
  const [chatOpen, setChatOpen] = useState(false);
  const state = stateQuery.data;
  const isDisputed = orderStatus === "DISPUTED";
  const adminUserId = meQuery.data?.id ?? null;

  const isInitialLoading = stateQuery.isPending || messagesQuery.isPending;
  const errorMessage =
    stateQuery.error?.message ||
    messagesQuery.error?.message ||
    "Unable to load the order chat.";

  // The chat is only surfaced while an order is disputed — that's when the
  // admin needs to join the brand/creator conversation. Once a dispute is
  // resolved, keep showing it only if messages already exist so history
  // already visible to the admin never disappears; otherwise stay hidden.
  if (isInitialLoading) {
    if (!isDisputed) return null;
    return (
      <AdminOrderChatShell className={className}>
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading order chat</p>
        </div>
      </AdminOrderChatShell>
    );
  }

  if (stateQuery.isError || messagesQuery.isError || !state) {
    if (!isDisputed) return null;
    return (
      <AdminOrderChatShell className={className}>
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
      </AdminOrderChatShell>
    );
  }

  const brandLabel = brand.brandName?.trim() || "Unnamed Brand";
  const creatorLabel = creator.displayName?.trim() || "Creator";

  const participants: MessagingParticipant[] = [
    {
      id: state.brandUserId,
      name: brandLabel,
      avatar: brand.logoUrl,
      roleLabel: "Brand",
    },
    {
      id: state.creatorUserId,
      name: creatorLabel,
      avatar: creator.profileImageUrl,
      roleLabel: "Creator",
    },
  ];
  if (adminUserId) {
    participants.push({
      id: adminUserId,
      name: "You",
      roleLabel: "Support",
    });
  }
  const messages = mapMessages(
    messagesQuery.data?.pages.map((page) => page.items) ?? [],
  );
  const hasMessages = messages.length > 0;

  // Outside a dispute, only keep the section around when there's message
  // history to preserve — never surface an empty chat box for an order that
  // isn't disputed.
  if (!isDisputed && !hasMessages) return null;

  const showChatPanel = chatOpen || hasMessages;

  // While the order is disputed, the admin joins the brand/creator conversation
  // as "Support", turning it into a three-way group chat. Outside a dispute the
  // history stays read-only.
  const canSend = isDisputed && Boolean(adminUserId);

  if (!showChatPanel) {
    return (
      <AdminOrderChatShell className={className}>
        <div className="flex max-w-sm flex-col items-center gap-4">
          <div className="rounded-2xl bg-muted p-4 text-muted-foreground">
            <MessageSquare className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h3 className="font-headline text-lg font-bold">No messages yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              There are no chat messages for this order.
            </p>
          </div>
          <Button type="button" onClick={() => setChatOpen(true)}>
            Open chat
          </Button>
        </div>
      </AdminOrderChatShell>
    );
  }

  return (
    <MessagingConversation
      alignRightUserId={adminUserId ?? state.brandUserId}
      className={className}
      emptyState="No chat messages have been sent for this order."
      hasMoreMessages={messagesQuery.hasNextPage}
      headerAvatarUrl={creator.profileImageUrl ?? brand.logoUrl}
      headerSubtitle={`${brandLabel} and ${creatorLabel}`}
      headerTitle={isDisputed ? "Dispute Group Chat" : "Order Chat History"}
      inputPlaceholder="Message the brand and creator as Support"
      isLoadingMore={messagesQuery.isFetchingNextPage}
      messages={messages}
      onLoadMore={
        messagesQuery.hasNextPage
          ? () => {
              void messagesQuery.fetchNextPage();
            }
          : undefined
      }
      onSendMessage={
        canSend
          ? async (text) => {
              await sendMutation.mutateAsync(text);
            }
          : undefined
      }
      participants={participants}
      readOnly={!canSend}
      sendError={
        sendMutation.isError
          ? "Unable to send the message. Please try again."
          : null
      }
      showSenderNames
    />
  );
}

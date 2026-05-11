"use client";

import type { ReactNode } from "react";
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
import { cn } from "@/lib/utils";
import {
  useAdminOrderChatMessagesInfiniteQuery,
  useAdminOrderChatStateQuery,
} from "../hooks/use-admin-order-chat";
import type { OrderChatMessageDto } from "../types";

type AdminOrderChatProps = {
  orderId: string;
  brand: OrderBrandSnapshot;
  creator: OrderCreatorSnapshot;
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
    text: message.text,
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
  className,
}: AdminOrderChatProps) {
  const stateQuery = useAdminOrderChatStateQuery(orderId);
  const messagesQuery = useAdminOrderChatMessagesInfiniteQuery(orderId);
  const state = stateQuery.data;

  const isInitialLoading = stateQuery.isPending || messagesQuery.isPending;
  const errorMessage =
    stateQuery.error?.message ||
    messagesQuery.error?.message ||
    "Unable to load the order chat.";

  if (isInitialLoading) {
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

  const participants: MessagingParticipant[] = [
    {
      id: state.brandUserId,
      name: brand.brandName,
      avatar: brand.logoUrl,
      roleLabel: "Brand",
    },
    {
      id: state.creatorUserId,
      name: creator.displayName,
      avatar: creator.profileImageUrl,
      roleLabel: "Creator",
    },
  ];
  const messages = mapMessages(
    messagesQuery.data?.pages.map((page) => page.items) ?? [],
  );

  return (
    <MessagingConversation
      alignRightUserId={state.brandUserId}
      className={className}
      emptyState="No chat messages have been sent for this order."
      hasMoreMessages={messagesQuery.hasNextPage}
      headerAvatarUrl={creator.profileImageUrl ?? brand.logoUrl}
      headerSubtitle={`${brand.brandName} and ${creator.displayName}`}
      headerTitle="Order Chat History"
      isLoadingMore={messagesQuery.isFetchingNextPage}
      messages={messages}
      onLoadMore={
        messagesQuery.hasNextPage
          ? () => {
              void messagesQuery.fetchNextPage();
            }
          : undefined
      }
      participants={participants}
      readOnly
      showSenderNames
    />
  );
}

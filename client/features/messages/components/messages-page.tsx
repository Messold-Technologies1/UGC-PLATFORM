"use client";

import { useState, useEffect, useMemo } from "react";
import { MessageSquare } from "lucide-react";
import { useMessagesQuery } from "../hooks/use-messages-query";
import { MessagesConversationList } from "./messages-conversation-list";
import { MessagesChatThread } from "./messages-chat-thread";
import { MessagesInfoPanel } from "./messages-info-panel";
import type { MessageConversation } from "../mock/messages-mock-data";

export function MessagesPage() {
  const { conversations: rawConversations, isLoading } = useMessagesQuery();

  const conversations = useMemo(() => {
    return rawConversations.map((conv) => ({
      ...conv,
      isChatLocked:
        conv.isChatLocked ||
        ["COMPLETED", "CANCELLED", "EXPIRED", "REFUNDED"].includes(
          conv.status.toUpperCase(),
        ),
    }));
  }, [rawConversations]);

  const [selected, setSelected] = useState<MessageConversation | null>(null);

  useEffect(() => {
    if (conversations.length > 0 && selected === null) {
      setSelected(conversations[0]);
    }
  }, [conversations, selected]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-background">
      <div className="px-6 py-4 border-b border-border bg-background shrink-0">
        <h1 className="text-xl font-bold text-foreground">Messages</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Communicate with brands about your active collaborations
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden divide-x divide-border">
        <div className="w-[280px] shrink-0 flex flex-col overflow-hidden bg-card">
          <MessagesConversationList
            conversations={conversations}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        </div>

        <div className="flex-1 overflow-hidden bg-background">
          {selected ? (
            <MessagesChatThread conversation={selected} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <MessageSquare className="size-12 opacity-20" />
              <p className="text-sm font-medium">Select a conversation</p>
            </div>
          )}
        </div>

        {selected && (
          <div className="w-[280px] shrink-0 overflow-hidden bg-card">
            <MessagesInfoPanel conversation={selected} />
          </div>
        )}
      </div>
    </div>
  );
}

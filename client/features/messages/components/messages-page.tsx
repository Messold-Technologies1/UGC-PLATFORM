"use client";

import { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { useMessagesQuery } from "../hooks/use-messages-query";
import { MessagesConversationList } from "./messages-conversation-list";
import { MessagesChatThread } from "./messages-chat-thread";
import { MessagesInfoPanel } from "./messages-info-panel";
import type { MessageConversation } from "../mock/messages-mock-data";

export function MessagesPage() {
  const { conversations, isLoading } = useMessagesQuery();
  const [selected, setSelected] = useState<MessageConversation | null>(null);

  // Select the first conversation once data is available.
  // Using useEffect (not useState initializer) so this works correctly
  // when conversations load asynchronously from a real API.
  useEffect(() => {
    if (conversations.length > 0 && selected === null) {
      setSelected(conversations[0]);
    }
  }, [conversations]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-background">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-border bg-background shrink-0">
        <h1 className="text-xl font-bold text-foreground">Messages</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Communicate with brands about your active collaborations
        </p>
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden divide-x divide-border">
        {/* Col 1: Conversation list (280px) */}
        <div className="w-[280px] shrink-0 flex flex-col overflow-hidden bg-card">
          <MessagesConversationList
            conversations={conversations}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        </div>

        {/* Col 2: Active thread (flex-1) */}
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

        {/* Col 3: Info panel (280px) */}
        {selected && (
          <div className="w-[280px] shrink-0 overflow-hidden bg-card">
            <MessagesInfoPanel conversation={selected} />
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { BrandAvatar, StatusBadge } from "@/features/creator-ui";
import {
  MSG_STATUS_COLORS,
  MSG_STATUS_LABELS,
  type MessageConversation,
} from "../mock/messages-mock-data";

interface Props {
  conversations: MessageConversation[];
  selectedId: string | null;
  onSelect: (c: MessageConversation) => void;
}

export function MessagesConversationList({ conversations, selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-border">
        <input
          placeholder="Search conversations..."
          className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={cn(
              "flex items-start gap-3 p-4 w-full text-left transition-colors hover:bg-accent/50",
              selectedId === c.id
                ? "bg-accent border-l-2 border-l-primary"
                : "border-l-2 border-l-transparent"
            )}
          >
            <BrandAvatar initials={c.brandInitials} bgClass={c.brandBgClass} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-sm font-bold text-foreground truncate">{c.brandName}</span>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                  {c.lastMessageTime}
                </span>
              </div>
              <div className="mb-1">
                <StatusBadge colorClass={MSG_STATUS_COLORS[c.status]}>
                  {MSG_STATUS_LABELS[c.status]}
                </StatusBadge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
            </div>
            {c.unreadCount > 0 && (
              <span className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-1">
                {c.unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

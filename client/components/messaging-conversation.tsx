"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import {
  Copy,
  Flag,
  Loader2,
  MoreHorizontal,
  Reply,
  Send,
  Trash2,
  UserMinus2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type StatusType = "online" | "dnd" | "offline";

export type MessagingParticipant = {
  id: string;
  name: string;
  avatar?: string | null;
  status?: StatusType;
  roleLabel?: string;
};

export type MessagingConversationMessage = {
  id: string;
  text: string;
  senderUserId: string;
  createdAt?: string;
  timeLabel?: string;
  statusLabel?: string;
};

type MessagingConversationProps = {
  className?: string;
  messages?: MessagingConversationMessage[];
  participants?: MessagingParticipant[];
  alignRightUserId?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  headerAvatarUrl?: string | null;
  readOnly?: boolean;
  showSenderNames?: boolean;
  emptyState?: string;
  hasMoreMessages?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  sendError?: string | null;
  inputPlaceholder?: string;
  maxMessageLength?: number;
  onSendMessage?: (text: string) => Promise<void> | void;
};

const DEMO_USER: MessagingParticipant = {
  id: "user-123",
  name: "You",
  avatar:
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop",
};

const DEMO_OTHER: MessagingParticipant = {
  id: "user-456",
  name: "Riya Sharma",
  avatar:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
  status: "online",
};

const DEMO_MESSAGES: MessagingConversationMessage[] = [
  {
    id: "1",
    text: "Hi! I've received the brief. Could you clarify the lighting preference for the bathroom shots?",
    senderUserId: DEMO_OTHER.id,
    timeLabel: "10:24 AM",
  },
  {
    id: "2",
    text: 'Hey Riya! We\'re aiming for "Morning Spa" vibes. Soft natural light, maybe some lens flares.',
    senderUserId: DEMO_USER.id,
    timeLabel: "11:02 AM",
  },
  {
    id: "3",
    text: "Perfect. I'll start filming as soon as the package arrives tomorrow.",
    senderUserId: DEMO_OTHER.id,
    timeLabel: "11:15 AM",
  },
  {
    id: "4",
    text: "Awesome. Keep us posted!",
    senderUserId: DEMO_USER.id,
    timeLabel: "Yesterday",
  },
];

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

function formatMessageTime(message: MessagingConversationMessage) {
  if (message.timeLabel) return message.timeLabel;
  if (!message.createdAt) return "";

  const date = new Date(message.createdAt);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  return new Intl.DateTimeFormat("en-US", {
    month: isToday ? undefined : "short",
    day: isToday ? undefined : "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status?: StatusType) {
  if (status === "online") return "Online Now";
  if (status === "dnd") return "Do Not Disturb";
  if (status === "offline") return "Offline";
  return "";
}

function UserActionsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Conversation actions"
          className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-muted"
          type="button"
        >
          <MoreHorizontal aria-hidden="true" className="size-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-36 rounded-lg bg-popover p-1 shadow-xl"
        align="end"
      >
        <div className="flex flex-col gap-1">
          <Button
            className="w-full justify-start gap-2 rounded bg-transparent text-rose-600 hover:bg-accent hover:text-rose-600"
            size="sm"
            type="button"
            variant="ghost"
          >
            <UserMinus2 aria-hidden="true" className="size-4" />
            <span className="font-medium text-xs">Block User</span>
          </Button>
          <Button
            className="w-full justify-start gap-2 rounded bg-transparent text-destructive hover:bg-accent hover:text-destructive"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            <span className="font-medium text-xs">Delete Conversation</span>
          </Button>
          <Button
            className="w-full justify-start gap-2 rounded bg-transparent text-yellow-600 hover:bg-accent hover:text-yellow-600"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Flag aria-hidden="true" className="size-4" />
            <span className="font-medium text-xs">Report User</span>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MessageActions({ isMe }: { isMe: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Message actions"
          className="size-5 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
          type="button"
        >
          <MoreHorizontal aria-hidden="true" className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isMe ? "end" : "start"}
        className="w-32 rounded-lg bg-popover p-1 shadow-xl"
      >
        <div className="flex flex-col gap-1">
          <Button
            aria-label="Reply"
            className="w-full justify-start gap-2 rounded px-2 py-1 text-xs"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Reply aria-hidden="true" className="size-3" />
            <span>Reply</span>
          </Button>
          <Button
            aria-label="Copy"
            className="w-full justify-start gap-2 rounded px-2 py-1 text-xs"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Copy aria-hidden="true" className="size-3" />
            <span>Copy</span>
          </Button>
          {isMe ? (
            <Button
              aria-label="Delete"
              className="w-full justify-start gap-2 rounded px-2 py-1 text-destructive text-xs hover:text-destructive"
              size="sm"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" className="size-3" />
              <span>Delete</span>
            </Button>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MessagingConversation({
  className,
  messages,
  participants,
  alignRightUserId,
  headerTitle,
  headerSubtitle,
  headerAvatarUrl,
  readOnly = false,
  showSenderNames = false,
  emptyState = "No messages yet.",
  hasMoreMessages = false,
  isLoadingMore = false,
  onLoadMore,
  sendError,
  inputPlaceholder = "Type a message...",
  maxMessageLength = 5000,
  onSendMessage,
}: MessagingConversationProps) {
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const resolvedParticipants = participants ?? [DEMO_USER, DEMO_OTHER];
  const resolvedMessages = messages ?? DEMO_MESSAGES;
  const lastMessageId = resolvedMessages.at(-1)?.id;
  const rightAlignedUserId = alignRightUserId ?? DEMO_USER.id;
  const participantById = new Map(
    resolvedParticipants.map((participant) => [participant.id, participant]),
  );
  const headerParticipant = resolvedParticipants.find(
    (participant) => participant.id !== rightAlignedUserId,
  ) ?? resolvedParticipants[0];
  const title = headerTitle ?? headerParticipant?.name ?? "Conversation";
  const subtitle =
    headerSubtitle ?? statusLabel(headerParticipant?.status) ?? "Messages";
  const avatarUrl = headerAvatarUrl ?? headerParticipant?.avatar;
  const trimmedDraft = draft.trim();
  const canSend = Boolean(onSendMessage) && Boolean(trimmedDraft);

  const handleSendMessage = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend || !onSendMessage) return;

    setDraft("");
    try {
      await onSendMessage(trimmedDraft);
    } catch {
      setDraft(trimmedDraft);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [lastMessageId]);

  return (
    <section
      className={cn(
        "bg-card rounded-3xl flex flex-col h-160 border shadow-sm overflow-hidden",
        className,
      )}
    >
      <div className="p-4 border-b bg-muted/40 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <Avatar className="w-10 h-10 border-2 border-background shadow-xs">
              <AvatarImage
                alt={title}
                src={avatarUrl || undefined}
                className="object-cover"
              />
              <AvatarFallback>{initials(title)}</AvatarFallback>
            </Avatar>
            {headerParticipant?.status ? (
              <span
                className={cn(
                  "absolute bottom-0 right-0 w-3 h-3 border-2 border-card rounded-full",
                  headerParticipant.status === "online"
                    ? "bg-emerald-500"
                    : headerParticipant.status === "dnd"
                      ? "bg-amber-500"
                      : "bg-muted-foreground",
                )}
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-card-foreground">
              {title}
            </div>
            {subtitle ? (
              <div className="truncate text-[10px] text-muted-foreground font-bold uppercase">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
        {readOnly ? null : <UserActionsMenu />}
      </div>

      <ScrollArea className="flex-1 min-h-0 p-5">
        <div className="flex flex-col gap-6">
          {hasMoreMessages && onLoadMore ? (
            <div className="flex justify-center">
              <Button
                className="h-8 rounded-lg px-3 text-xs"
                disabled={isLoadingMore}
                onClick={onLoadMore}
                size="sm"
                type="button"
                variant="outline"
              >
                {isLoadingMore ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Load older messages
              </Button>
            </div>
          ) : null}

          {resolvedMessages.length === 0 ? (
            <div className="flex h-full min-h-64 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 text-center text-sm text-muted-foreground">
              {emptyState}
            </div>
          ) : (
            resolvedMessages.map((msg) => {
              const sender = participantById.get(msg.senderUserId);
              const isMe = msg.senderUserId === rightAlignedUserId;
              const timestamp = formatMessageTime(msg);

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-1.5 group w-full",
                    isMe ? "items-end" : "items-start",
                  )}
                >
                  {showSenderNames ? (
                    <div
                      className={cn(
                        "max-w-[85%] truncate px-1 text-[10px] font-bold uppercase text-muted-foreground",
                        isMe ? "text-right" : "text-left",
                      )}
                    >
                      {sender?.roleLabel
                        ? `${sender.name} - ${sender.roleLabel}`
                        : sender?.name ?? "Unknown user"}
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "p-3.5 px-4 rounded-2xl text-sm w-fit max-w-[85%] whitespace-pre-wrap break-words",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-sm font-medium"
                        : "bg-muted text-foreground rounded-tl-sm",
                    )}
                  >
                    {msg.text}
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-1 text-[10px] font-medium text-muted-foreground",
                      isMe ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    {timestamp ? <span>{timestamp}</span> : null}
                    {msg.statusLabel ? <span>{msg.statusLabel}</span> : null}
                    {readOnly ? null : (
                      <div className="opacity-0 transition-opacity group-hover:opacity-100">
                        <MessageActions isMe={isMe} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {readOnly ? null : (
        <div className="p-4 bg-muted/20 border-t">
          <form className="relative flex items-center" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder={inputPlaceholder}
              className="w-full bg-background border rounded-xl py-3 pl-4 pr-12 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-muted-foreground shadow-sm"
              disabled={!onSendMessage}
              maxLength={maxMessageLength}
              onChange={(event) => setDraft(event.target.value)}
              value={draft}
            />
            <button
              aria-label="Send message"
              className="absolute right-1.5 w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary/10 disabled:hover:text-primary disabled:active:scale-100"
              disabled={!canSend}
              type="submit"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          {sendError ? (
            <p className="mt-2 text-xs font-medium text-destructive">
              {sendError}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

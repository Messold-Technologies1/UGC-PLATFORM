"use client";

import {
  Copy,
  Flag,
  MoreHorizontal,
  Reply,
  Trash2,
  UserMinus2,
  PlusCircle,
  Send,
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

const DEMO_USER = {
  id: "user-123",
  name: "You",
  avatar:
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop",
};

type StatusType = "online" | "dnd" | "offline";
const DEMO_OTHER = {
  id: "user-456",
  name: "Riya Sharma",
  avatar:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
  status: "online" as StatusType,
};

const DEMO_MESSAGES = [
  {
    id: 1,
    text: "Hi! I've received the brief. Could you clarify the lighting preference for the bathroom shots?",
    sender: DEMO_OTHER,
    time: "10:24 AM",
  },
  {
    id: 2,
    text: 'Hey Riya! We\'re aiming for "Morning Spa" vibes. Soft natural light, maybe some lens flares.',
    sender: DEMO_USER,
    time: "11:02 AM",
  },
  {
    id: 3,
    text: "Perfect. I'll start filming as soon as the package arrives tomorrow.",
    sender: DEMO_OTHER,
    time: "11:15 AM",
  },
  {
    id: 4,
    text: "Awesome. Keep us posted!",
    sender: DEMO_USER,
    time: "Yesterday",
  },
];

function UserActionsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-muted">
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

export function MessagingConversation({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "bg-card rounded-3xl flex flex-col h-[640px] border shadow-sm overflow-hidden",
        className,
      )}
    >
      <div className="p-4 border-b bg-muted/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-10 h-10 border-2 border-background shadow-xs">
              <AvatarImage
                alt={DEMO_OTHER.name}
                src={DEMO_OTHER.avatar}
                className="object-cover"
              />
              <AvatarFallback>{DEMO_OTHER.name[0]}</AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full"></span>
          </div>
          <div>
            <div className="text-sm font-bold text-card-foreground">
              {DEMO_OTHER.name}
            </div>
            <div className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold uppercase">
              Online Now
            </div>
          </div>
        </div>
        <UserActionsMenu />
      </div>

      <ScrollArea className="flex-1 min-h-0 p-5">
        <div className="flex flex-col gap-6">
          {DEMO_MESSAGES.map((msg) => {
            const isMe = msg.sender.id === DEMO_USER.id;
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col gap-1.5 group w-full",
                  isMe ? "items-end" : "items-start",
                )}
              >
                <div
                  className={cn(
                    "p-3.5 px-4 rounded-2xl text-sm w-fit max-w-[85%]",
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
                  <span>{msg.time}</span>
                  <div className="opacity-0 transition-opacity group-hover:opacity-100">
                    <MessageActions isMe={isMe} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 bg-muted/20 border-t">
        <div className="relative flex items-center">
          <button className="absolute left-3 text-muted-foreground hover:text-primary transition-colors p-1">
            <PlusCircle className="w-5 h-5" />
          </button>
          <input
            type="text"
            placeholder="Type a message..."
            className="w-full bg-background border rounded-xl py-3 pl-11 pr-12 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-muted-foreground shadow-sm"
          />
          <button className="absolute right-1.5 w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

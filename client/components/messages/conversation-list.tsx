import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface MessageListConversation {
  id: string;
  name: string;
  avatarText: string;
  avatarUrl?: string | null;
  avatarColor: string;
  status: string;
  subtitle?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface ConversationListProps {
  conversations: MessageListConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  error?: string | null;
}



export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading = false,
  error = null,
}: ConversationListProps) {
  const unreadTotal = conversations.reduce(
    (total, conv) => total + (conv.unreadCount > 0 ? 1 : 0),
    0,
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <div className="p-4 flex flex-col gap-4 border-b border-border">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search conversations..." 
              className="pl-10 bg-muted/40 hover:bg-muted/60 focus:bg-background border-border/40 rounded-lg shadow-inner transition-colors"
            />
          </div>
          <Button variant="outline" size="icon" className="shrink-0 rounded-lg border-border/40 text-muted-foreground shadow-sm hover:shadow">
            <Filter className="size-4" />
          </Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-muted/50 p-1 rounded-lg h-auto">
            <TabsTrigger 
              value="all" 
              className="rounded-lg py-1.5 text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="unread" 
              className="rounded-lg py-1.5 text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Unread 
              {unreadTotal > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 size-4 rounded-full text-[9px] font-bold">
                  {unreadTotal}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div
                className="flex items-start gap-3 border-b border-border/40 px-4 py-3"
                key={index}
              >
                <div className="size-10 shrink-0 rounded-full bg-muted" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))
          ) : error ? (
            <div className="px-4 py-6 text-sm text-destructive">{error}</div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              No order conversations yet.
            </div>
          ) : (
            conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "flex items-start gap-3 px-3 py-3 mx-2 my-1 rounded-lg text-left transition-all duration-300 ease-in-out border border-transparent",
                selectedId === conv.id 
                  ? "bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] ring-1 ring-indigo-500/10 dark:bg-slate-800 dark:ring-indigo-500/20" 
                  : "hover:bg-accent/50 hover:scale-[1.01] dark:hover:bg-slate-800/50 bg-transparent"
              )}
            >
              <Avatar
                className={cn(
                  "size-10 shrink-0 shadow-sm",
                  !conv.avatarUrl && conv.avatarColor,
                )}
              >
                <AvatarImage alt={conv.name} src={conv.avatarUrl || undefined} />
                <AvatarFallback className={cn("text-xs font-semibold", conv.avatarColor)}>
                  {conv.avatarText}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="font-semibold text-sm truncate text-foreground">{conv.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{conv.lastMessageTime}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {conv.subtitle ? (
                      <p className="truncate text-[11px] font-medium uppercase text-muted-foreground">
                        {conv.subtitle}
                      </p>
                    ) : null}
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="flex items-center justify-center size-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold shrink-0 shadow-sm">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/50 mt-auto bg-muted/20">
        <p className="text-xs text-muted-foreground">
          Showing {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}

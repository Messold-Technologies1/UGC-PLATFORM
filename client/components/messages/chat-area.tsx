import {
  CheckCircle2,
  Lock,
  MoreHorizontal,
  Smile,
  Send,
  Truck,
  ExternalLink,
  Check,
  CheckCheck,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Conversation, Message } from "./mock-data";
import { cn } from "@/lib/utils";

interface ChatAreaProps {
  conversation: Conversation;
  messages: Message[];
  onBack?: () => void;
}

export function ChatArea({ conversation, messages, onBack }: ChatAreaProps) {
  const isLocked = ["Completed", "Cancelled", "Expired", "Refunded"].includes(
    conversation.status,
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-transparent h-full overflow-hidden">
      <div className="h-20 border-b border-border flex items-center justify-between px-4 sm:px-6 bg-background shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0 -ml-2"
              onClick={onBack}
            >
              <ArrowLeft className="size-5" />
            </Button>
          )}
          <div
            className={cn(
              "flex items-center justify-center size-12 rounded-full text-white font-medium text-lg shrink-0 shadow-sm",
              conversation.avatarColor,
            )}
          >
            {conversation.avatarText}
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg truncate text-foreground">
                {conversation.name}
              </h2>
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
                  conversation.status === "Completed"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                    : conversation.status === "In Progress"
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
                )}
              >
                {conversation.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              UGC Video (60s) <span className="mx-1">•</span> Order #GC12345
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
          >
            View Order <ExternalLink className="ml-2 size-3" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <MoreHorizontal className="size-5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          {messages.map((msg, idx) => (
            <div key={msg.id} className="flex flex-col">
              {msg.dateHeader && (
                <div className="flex justify-center mb-6 mt-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {msg.dateHeader}
                  </span>
                </div>
              )}

              {msg.type === "order_status" && msg.metadata && (
                <div className="flex justify-center mb-6 w-full">
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full max-w-2xl">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <CheckCircle2 className="size-5 text-emerald-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-emerald-900 dark:text-emerald-300">
                          {msg.metadata.title}
                        </h4>
                        <p className="text-xs text-emerald-700 dark:text-emerald-500">
                          {msg.metadata.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                    >
                      Order Summary
                    </Button>
                  </div>
                </div>
              )}

              {msg.type === "text" && (
                <div
                  className={cn(
                    "flex items-end gap-2 max-w-[80%] mb-1",
                    msg.sender === "me"
                      ? "self-end flex-row-reverse"
                      : "self-start",
                  )}
                >
                  {msg.sender === "them" && (
                    <div
                      className={cn(
                        "flex items-center justify-center size-8 rounded-full text-white font-medium text-xs shrink-0",
                        conversation.avatarColor,
                      )}
                    >
                      {conversation.avatarText}
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex flex-col gap-1",
                      msg.sender === "me" ? "items-end" : "items-start",
                    )}
                  >
                    <div
                      className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                        msg.sender === "me"
                          ? "bg-indigo-100 text-indigo-900 dark:bg-indigo-600 dark:text-white rounded-br-sm"
                          : "bg-white text-foreground dark:bg-slate-800 border border-border/50 rounded-bl-sm",
                      )}
                    >
                      {msg.text}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground px-1">
                      {msg.time}
                      {msg.sender === "me" &&
                        (msg.isRead ? (
                          <CheckCheck className="size-3 text-indigo-500" />
                        ) : (
                          <Check className="size-3" />
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {msg.type === "shipping_details" && msg.metadata && (
                <div
                  className={cn(
                    "flex items-end gap-2 max-w-[85%] sm:max-w-[70%] mb-1",
                    msg.sender === "me"
                      ? "self-end flex-row-reverse"
                      : "self-start",
                  )}
                >
                  <div
                    className={cn(
                      "flex flex-col gap-1 w-full max-w-xs sm:max-w-md",
                      msg.sender === "me" ? "items-end" : "items-start",
                    )}
                  >
                    <div className="bg-background border border-border/50 rounded-2xl p-4 w-full shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                          <Truck className="size-5" />
                        </div>
                        <div className="flex-1 min-w-0 flex justify-between gap-4">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                              Tracking ID
                            </p>
                            <p className="text-sm font-semibold text-foreground truncate">
                              {msg.metadata.trackingId}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                              Courier Partner
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                              {msg.metadata.courier}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end pt-3 border-t border-indigo-100 dark:border-indigo-900/50">
                        <Button
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 h-8 text-xs font-medium shadow-sm"
                        >
                          Track Shipment
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground px-1 mt-1">
                      {msg.time}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 bg-background border-t border-border shrink-0">
        <div className="max-w-4xl mx-auto">
          {isLocked ? (
            <div className="bg-muted/50 border border-border rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-8 rounded-lg bg-background border border-border shrink-0">
                  <Lock className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">
                    Messaging is closed
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    You can no longer send messages in this conversation.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
              >
                Need help? Contact support
              </Button>
            </div>
          ) : (
            <div className="relative flex items-center">
              <Input
                placeholder="Type a message..."
                className="pr-24 pl-4 py-6 bg-background rounded-2xl shadow-sm border-border/80 focus-visible:ring-indigo-500/20"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground rounded-full size-10"
                >
                  <Smile className="size-5" />
                </Button>
                <Button
                  size="icon"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full size-10 shadow-sm"
                >
                  <Send className="size-4 ml-0.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

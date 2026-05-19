"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Lock, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageConversation } from "../mock/messages-mock-data";

interface Props {
  conversation: MessageConversation;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MessagesChatThread({ conversation }: Props) {
  const [inputText, setInputText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.id]);

  // Group messages by date
  const grouped: { date: string; messages: typeof conversation.messages }[] =
    [];
  for (const msg of conversation.messages) {
    const date = formatDate(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) {
      last.messages.push(msg);
    } else {
      grouped.push({ date, messages: [msg] });
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-card shrink-0">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg font-bold text-white text-xs",
            conversation.brandBgClass
          )}
        >
          {conversation.brandInitials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground">
            {conversation.brandName}
          </p>
          <p className="text-xs text-muted-foreground">
            Order #{conversation.orderId} · {conversation.packageName}
          </p>
        </div>
        <a
          href="/creator/orders-v2"
          className="text-xs font-semibold text-primary hover:underline"
        >
          View Order
        </a>
      </div>

      {/* Locked banner */}
      {conversation.isChatLocked && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-muted/50 border-b border-border text-muted-foreground text-xs font-medium">
          <Lock className="size-3.5" />
          This order is completed. The chat is now read-only.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {grouped.map(({ date, messages }) => (
          <div key={date} className="flex flex-col gap-3">
            {/* Date divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                {date}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {messages.map((msg) =>
              msg.isTracking && msg.trackingData ? (
                // Tracking card
                <div key={msg.id} className="flex justify-center">
                  <div className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-card max-w-[280px] w-full">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <Truck className="size-3.5 text-sky-500" />
                      Product Shipped
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {msg.text}
                    </p>
                    <div className="text-xs">
                      <span className="text-muted-foreground">
                        {msg.trackingData.courier} ·{" "}
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        {msg.trackingData.trackingId}
                      </span>
                    </div>
                    <span className="self-start px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 border border-sky-500/20 text-[10px] font-semibold">
                      {msg.trackingData.status}
                    </span>
                  </div>
                </div>
              ) : (
                // Normal message bubble
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[72%]",
                    msg.senderId === "creator" ? "self-end items-end" : "self-start items-start"
                  )}
                >
                  <div
                    className={cn(
                      "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                      msg.senderId === "creator"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    )}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              )
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-5 py-3 border-t border-border bg-card shrink-0">
        {conversation.isChatLocked ? (
          <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground text-sm">
            <Lock className="size-4" />
            <span>Chat is locked for completed orders</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 text-sm bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            />
            <button
              disabled={!inputText.trim()}
              className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

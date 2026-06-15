"use client";

import { ExternalLink, Star, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MSG_STATUS_COLORS,
  MSG_STATUS_LABELS,
  type MessageConversation,
} from "../mock/messages-mock-data";

interface Props {
  conversation: MessageConversation;
}

export function MessagesInfoPanel({ conversation: c }: Props) {
  return (
    <div className="flex flex-col gap-5 p-5 overflow-y-auto h-full">
      <div className="p-4 rounded-2xl border border-border bg-card shadow-sm flex flex-col gap-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={cn("size-14 rounded-xl flex items-center justify-center font-bold text-white text-xl", c.brandBgClass)}>
            {c.brandInitials}
          </div>
          <div>
            <p className="font-bold text-foreground">{c.brandName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {c.brandCategory}
            </p>
          </div>
          <span className={cn("px-2.5 py-1 text-xs uppercase font-bold rounded-full", MSG_STATUS_COLORS[c.status])}>
            {MSG_STATUS_LABELS[c.status]}
          </span>
          <a
            href="/creator/orders-v2"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <ExternalLink className="size-3" />
            View Order Details
          </a>
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-border bg-card shadow-sm flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Order Info</h3>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm py-1"><span className="text-muted-foreground">Order ID</span><span className="font-semibold text-foreground">#{c.orderId}</span></div>
          <div className="flex justify-between items-center text-sm py-1"><span className="text-muted-foreground">Package</span><span className="font-semibold text-foreground">{c.packageName}</span></div>
          <div className="flex justify-between items-center text-sm py-1"><span className="text-muted-foreground">Status</span><span className="font-semibold text-foreground">{MSG_STATUS_LABELS[c.status]}</span></div>
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-border bg-card shadow-sm flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Brand Stats</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center p-2 rounded-xl bg-muted/50 border border-border/50">
            <span className="text-xs text-muted-foreground mb-1">Orders</span>
            <span className="text-sm font-bold text-foreground">12</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-xl bg-muted/50 border border-border/50">
            <span className="text-xs text-muted-foreground mb-1">Completed</span>
            <span className="text-sm font-bold text-foreground">10</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-xl bg-muted/50 border border-border/50">
            <span className="text-xs text-muted-foreground mb-1">Rating</span>
            <span className="text-sm font-bold text-foreground flex items-center justify-center gap-0.5">
              <Star className="size-3 fill-yellow-400 text-yellow-400" />
              4.8
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-2">
          <Package className="size-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
              Keep all communication here
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 leading-relaxed">
              All payments, agreements, and deliverables must happen through the
              platform. Off-platform communication is not supported.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

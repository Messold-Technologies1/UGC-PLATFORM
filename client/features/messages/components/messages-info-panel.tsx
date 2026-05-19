"use client";

import { ExternalLink, Star, Package } from "lucide-react";
import { BrandAvatar, StatusBadge, SectionCard, KeyValueRow, StatGrid } from "@/features/creator-ui";
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
      {/* Brand card */}
      <SectionCard>
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandAvatar initials={c.brandInitials} bgClass={c.brandBgClass} size="lg" className="size-14 rounded-xl" />
          <div>
            <p className="font-bold text-foreground">{c.brandName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.brandCategory}</p>
          </div>
          <StatusBadge colorClass={MSG_STATUS_COLORS[c.status]}>
            {MSG_STATUS_LABELS[c.status]}
          </StatusBadge>
          <a
            href="/creator/orders-v2"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <ExternalLink className="size-3" />
            View Order Details
          </a>
        </div>
      </SectionCard>

      {/* Order info */}
      <SectionCard title="Order Info">
        <div className="flex flex-col gap-2">
          <KeyValueRow label="Order ID" value={`#${c.orderId}`} />
          <KeyValueRow label="Package" value={c.packageName} />
          <KeyValueRow label="Status" value={MSG_STATUS_LABELS[c.status]} />
        </div>
      </SectionCard>

      {/* Brand stats */}
      <SectionCard title="Brand Stats">
        <StatGrid
          cols={3}
          items={[
            { label: "Orders", value: "12" },
            { label: "Completed", value: "10" },
            {
              label: "Rating",
              value: (
                <span className="flex items-center justify-center gap-0.5">
                  <Star className="size-3 fill-yellow-400 text-yellow-400" />
                  4.8
                </span>
              ),
            },
          ]}
        />
      </SectionCard>

      {/* Platform rules */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-2">
          <Package className="size-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
              Keep all communication here
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 leading-relaxed">
              All payments, agreements, and deliverables must happen through the platform.
              Off-platform communication is not supported.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

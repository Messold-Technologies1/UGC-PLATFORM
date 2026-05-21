"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { OrderCreatorSnapshot } from "../../api/types";

interface ChatPreviewCardProps {
  creator: OrderCreatorSnapshot;
  orderId: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ChatPreviewCard({ creator, orderId }: ChatPreviewCardProps) {
  const creatorName = creator.displayName || "Creator";

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Chat with {creatorName.split(" ")[0]}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="size-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">
              Active now
            </span>
          </div>
        </div>
        <Link
          href={`/brand/orders/${orderId}/messages`} // generic message path, or we can just use # for now
          className="text-xs font-bold text-primary hover:underline"
        >
          View all messages
        </Link>
      </div>

      {/* Message preview */}
      <div className="flex items-start gap-3 mt-auto">
        <Avatar className="size-8 border border-border/50 shrink-0">
          <AvatarImage
            src={creator.profileImageUrl || undefined}
            alt={creatorName}
          />
          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
            {getInitials(creatorName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-foreground">{creatorName.split(" ")[0]}</h4>
          <p className="text-sm text-muted-foreground mt-1 leading-snug">
            Please let me know if you need any changes. Happy to help!
          </p>
        </div>
      </div>

      <div className="text-right mt-3">
        <span className="text-[10px] font-medium text-muted-foreground">
          6:45 PM
        </span>
      </div>
    </div>
  );
}

"use client";

import { Info, MessageCircle, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrderCreatorSnapshot, OrderDetailsPublic } from "../../api/types";

interface CreatorProfileCardProps {
  creator: OrderCreatorSnapshot;
  order: OrderDetailsPublic;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getWhatsNextMessage(status: string, creatorName: string): string {
  switch (status) {
    case "BRIEF_SUBMISSION_PENDING":
      return `Submit your brief so ${creatorName} can review and start your project.`;
    case "BRIEF_SUBMITTED":
      return `${creatorName} will review your brief and accept or decline the project. If she accepts, you can proceed to the next steps.`;
    case "BRIEF_ACCEPTED":
      return `Ship your product to ${creatorName} so she can begin creating your content.`;
    case "PRODUCT_SHIPPED":
      return `${creatorName} will confirm receipt of your product and then begin production.`;
    case "PRODUCT_RECEIVED":
      return `${creatorName} is working on your content. You'll be notified when it's ready.`;
    case "DELIVERED":
    case "REVISION_SUBMITTED":
      return `Review ${creatorName}'s delivered content. You can approve or request revisions.`;
    case "REVISION_REQUESTED":
      return `${creatorName} is working on the requested revisions. You'll be notified when the updated content is ready.`;
    default:
      return `${creatorName} will review your brief and accept or decline the project. If she accepts, you can proceed to the next steps.`;
  }
}

export function CreatorProfileCard({
  creator,
  order,
}: CreatorProfileCardProps) {
  const creatorName = creator.displayName || "Creator";

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      {/* Profile row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="size-14 border-2 border-primary/20 shrink-0">
            <AvatarImage
              src={creator.profileImageUrl || undefined}
              alt={creatorName}
            />
            <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
              {getInitials(creatorName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-foreground">
                {creatorName}
              </h3>
              <Badge className="rounded-full bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold px-2 py-0">
                Top Creator
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mt-0.5">
              {creator.city ? `${creator.city}, India` : "India"} • Hindi,
              English
            </p>

            <div className="flex items-center gap-1.5 mt-1">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold text-foreground">4.9</span>
              <span className="text-sm text-muted-foreground">
                (126 reviews)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg text-sm font-medium"
            disabled
          >
            View Profile
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg text-sm font-medium"
            disabled
          >
            <MessageCircle className="size-4" />
            Message
          </Button>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-primary/5 border border-primary/10 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
            <Info className="size-3.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">
              What happens next?
            </p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {getWhatsNextMessage(order.status, creatorName)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

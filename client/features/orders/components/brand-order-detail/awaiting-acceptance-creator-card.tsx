"use client";

import { Star, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { OrderCreatorSnapshot, OrderDetailsPublic } from "../../api/types";
import { useCreatorProfileQuery } from "../../../creators/hooks/use-creator-profile-query";

interface AwaitingAcceptanceCreatorCardProps {
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

export function AwaitingAcceptanceCreatorCard({
  creator,
  order,
}: AwaitingAcceptanceCreatorCardProps) {
  const creatorName = creator.displayName || "Creator";
  const firstName = creatorName.split(" ")[0];
  const { data: creatorProfile } = useCreatorProfileQuery(creator.id, { enabled: !!creator.id });

  const ACCEPTED_STATUSES = [
    "BRIEF_ACCEPTED",
    "PRODUCT_SHIPPED",
    "PRODUCT_RECEIVED",
    "DELIVERED",
    "REVISION_REQUESTED",
    "REVISION_SUBMITTED",
    "ACCEPTED",
    "CREATOR_PAYMENT_DONE",
  ];
  const isAwaitingPayment = order.status === "PENDING_PAYMENT";
  const isAwaitingAcceptance = order.status === "BRIEF_SUBMITTED";
  const isAccepted = ACCEPTED_STATUSES.includes(order.status);
  const isPendingBrief =
    !isAwaitingPayment && !isAwaitingAcceptance && !isAccepted;

  let infoMessage = "";
  if (isAwaitingPayment) {
    infoMessage =
      "Complete payment to confirm this order. Brief submission and creator coordination unlock after payment.";
  } else if (isAwaitingAcceptance) {
    infoMessage = `${firstName} will review your brief and accept or decline the project. If she accepts, you can proceed to the next steps.`;
  } else if (isPendingBrief) {
    infoMessage = `Submit your brief so ${firstName} can review and accept the project.`;
  } else if (isAccepted) {
    infoMessage = `${firstName} has accepted your project. You can now chat and coordinate on deliverables.`;
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Avatar className="size-16 border-2 border-primary/20 shrink-0">
            <AvatarImage
              src={creator.profileImageUrl || undefined}
              alt={creatorName}
            />
            <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
              {getInitials(creatorName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-lg font-bold text-foreground">
                {creatorName}
              </h4>
              <Badge className="rounded-md bg-[#F4F0FF] text-[#6E42FF] hover:bg-[#F4F0FF] border-transparent text-[11px] font-semibold px-2 py-0.5">
                Top Creator
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mt-1">
              {creator.city ? `${creator.city}, India` : "India"} • Hindi,
              English
            </p>

            <div className="flex items-center gap-1.5 mt-1">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold text-foreground">
                {creator.avgRating ?? creatorProfile?.avgRating ?? "New"}
              </span>
              <span className="text-sm text-muted-foreground underline underline-offset-2">
                ({creator.reviewCount ?? creatorProfile?.reviewCount ?? 0} reviews)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            className="rounded-lg text-sm font-semibold h-10 px-5"
            asChild
          >
            <Link href={`/brand/creators?creatorId=${creator.id}`}>View Profile</Link>
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl bg-[#F9F8FF] p-4">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full text-[#6E42FF] mt-0.5">
          <MapPin className="size-5 fill-[#6E42FF] text-white" />
        </div>
        <div className="space-y-1">
          <h5 className="text-sm font-semibold text-[#6E42FF]">
            What happens next?
          </h5>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {infoMessage}
          </p>
        </div>
      </div>
    </div>
  );
}

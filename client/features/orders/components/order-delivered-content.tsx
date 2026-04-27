"use client";

import { CheckCircle, FileEdit, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThumbnailsCarousel } from "@/components/ui/thumbnails-carousel";
import { cn } from "@/lib/utils";
import type { OrderDetailsPublic } from "../api/types";

interface OrderDeliveredContentProps {
  order?: OrderDetailsPublic;
}

export function OrderDeliveredContent({ order }: OrderDeliveredContentProps) {
  if (!order) return null;

  const canReviewDelivery =
    order.status === "DELIVERED" || order.status === "REVISION_SUBMITTED";

  return (
    <section className="bg-card rounded-3xl overflow-hidden border shadow-sm">
      <div className="flex flex-col gap-4 border-b bg-muted/30 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <PlayCircle className="w-5 h-5 text-foreground" />
          <h2 className="text-lg font-bold text-foreground">Delivered Content</h2>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "w-fit rounded-full px-3 py-1 text-[11px] font-semibold",
            canReviewDelivery
              ? "border-primary/20 bg-primary/10 text-primary"
              : "border-border/70 bg-muted text-muted-foreground",
          )}
        >
          {canReviewDelivery ? "Ready for review" : "Awaiting delivery"}
        </Badge>
      </div>

      <div className="p-6 md:p-8">
        <ThumbnailsCarousel />

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <Button
            disabled={!canReviewDelivery}
            className="w-full py-4 font-bold shadow-lg shadow-primary/10 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
          >
            <CheckCircle className="w-5 h-5" />
            Approve
          </Button>
          <Button
            variant="outline"
            disabled={!canReviewDelivery}
            className="w-full px-8 py-4 font-semibold hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <FileEdit className="w-5 h-5" />
            Request Revision
          </Button>
        </div>
      </div>
    </section>
  );
}

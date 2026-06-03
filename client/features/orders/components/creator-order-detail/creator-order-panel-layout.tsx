"use client";

import { ReactNode, useRef } from "react";
import Link from "next/link";
import { ExternalLink, MessageSquare, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { OrderProgressStepper, type StepDef } from "./order-progress-stepper";

interface CreatorOrderPanelLayoutProps {
  selectedOrderId: string;
  selectedItem: any;
  isLoading: boolean;
  onClose: () => void;
  statusBadgeLabel: string;
  statusBadgeColor: string;
  payoutAmountDisplay?: string;
  payoutLabelDisplay?: string;
  expectedAmount?: number;
  steps: StepDef[];
  viewingStepId?: string;
  children: ReactNode;
}

export function CreatorOrderPanelLayout({
  selectedOrderId,
  selectedItem,
  isLoading,
  onClose,
  statusBadgeLabel,
  statusBadgeColor,
  payoutAmountDisplay,
  payoutLabelDisplay = "Est. Payout",
  expectedAmount,
  steps,
  viewingStepId,
  children,
}: CreatorOrderPanelLayoutProps) {

  const amountDisplay =
    payoutAmountDisplay ??
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(expectedAmount || 0);

  if (!selectedItem) return null;

  return (
    <div className="bg-background rounded-xl border border-border/40 shadow-sm p-5 sm:p-6 flex flex-col xl:flex-row gap-6 xl:gap-8 items-stretch relative w-full">
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar className="w-12 h-12 rounded-lg bg-[#e8f5e9] text-[#2e7d32] shrink-0">
              <AvatarImage
                src={selectedItem.brand.logoUrl || undefined}
                className="object-cover rounded-lg"
              />
              <AvatarFallback className="bg-transparent font-bold rounded-lg text-lg">
                {selectedItem.brand.brandName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col justify-center gap-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg leading-none whitespace-nowrap text-foreground">
                  Order #{selectedItem.order.id.substring(0, 5).toUpperCase()}
                </h2>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[11px] font-bold px-2.5 py-0.5 rounded-full border-0 whitespace-nowrap",
                    statusBadgeColor,
                  )}
                >
                  {statusBadgeLabel}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-none truncate">
                {selectedItem.brand.brandName} •{" "}
                {selectedItem.order.packageNameSnapshot || "UGC Video (60s)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex flex-col justify-center items-end gap-1.5">
              <span className="font-bold text-lg leading-none text-foreground">
                {amountDisplay}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium tracking-wider leading-none">
                {payoutLabelDisplay}
              </span>
            </div>

            {/* <Button
              variant="outline"
              className="rounded-lg h-9 text-xs font-semibold gap-1.5 border-border/50 text-primary hover:text-primary whitespace-nowrap"
              asChild
            >
              <Link href={`/creator/orders/${selectedOrderId}/brief`}>
                View Brief <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </Button> */}

            <Button
              variant="outline"
              className="rounded-lg h-9 px-3.5 text-xs font-semibold border-border/50 whitespace-nowrap"
              asChild
            >
              <Link href={`/creator/messages?orderId=${selectedOrderId}`} className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Contact Brand
              </Link>
            </Button>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mb-8 px-1">
          <OrderProgressStepper steps={steps} viewingStepId={viewingStepId} />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

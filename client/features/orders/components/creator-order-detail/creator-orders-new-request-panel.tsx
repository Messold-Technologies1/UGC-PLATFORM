"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  X,
  Clock,
  FileText,
  MessageSquare,
  Star,
  XCircle,
  Music,
  ClipboardCheck,
  Truck,
  FileVideo,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
// import { cn } from "@/lib/utils";
import Link from "next/link";
import { useAcceptBriefMutation } from "../../hooks/use-accept-brief-mutation";
import { DeliveryDeadlineDisplay } from "../delivery-deadline-display";
import {
  formatCreatorPayoutInr,
  getCreatorPayoutFromOrderTotal,
  resolveOrderTotalInr,
} from "../../lib/creator-payout";
import { CreatorPayoutDetailsCard } from "./creator-payout-details-card";
import { brandDisplayName, brandInitials } from "@/features/brands/lib/brand-display";

interface CreatorOrderNewRequestPanelProps {
  selectedOrderId: string;
  selectedItem: any;
  detailsData: any;
  briefData: any;
  isLoading: boolean;
  onClose: () => void;
  onAccepted?: () => void;
}

function formatEnumLabel(value?: string | string[] | null) {
  if (!value) return "N/A";
  const values = Array.isArray(value) ? value : [value];
  if (values.length === 0) return "N/A";

  return values
    .map((item) =>
      item
        .split("_")
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(" "),
    )
    .join(", ");
}

export function CreatorOrderNewRequestPanel({
  selectedOrderId,
  selectedItem,
  detailsData,
  briefData,
  isLoading,
  onClose,
  onAccepted,
}: CreatorOrderNewRequestPanelProps) {
  const acceptBriefMutation = useAcceptBriefMutation({
    onSuccess: () => {
      if (onAccepted) {
        onAccepted();
      } else {
        onClose();
      }
    },
  });

  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    // The 48h acceptance window runs from when the brief was submitted to the
    // creator, not from when the order row was created. Without a submission
    // time there is no acceptance clock, so leave the countdown unset.
    const briefSubmittedAt = selectedItem?.order?.briefSubmittedAt;
    if (!briefSubmittedAt) return;

    const calculateTimeLeft = () => {
      const submittedAt = new Date(briefSubmittedAt).getTime();
      const expiresAt = submittedAt + 48 * 60 * 60 * 1000;
      const now = Date.now();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [selectedItem?.order?.briefSubmittedAt]);

  const hasTimeExceeded = timeLeft !== null && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  if (!selectedItem) return null;

  const hasBrief = Boolean(selectedItem.order.hasBrief);
  const creatorEarnings = getCreatorPayoutFromOrderTotal(
    resolveOrderTotalInr({
      expectedAmountPaise: detailsData?.order?.expectedAmountPaise,
      priceAmountSnapshot:
        detailsData?.order?.priceAmountSnapshot ??
        selectedItem.order.priceAmountSnapshot,
    }),
  ).creatorEarnings;

  return (
    <div className="bg-background rounded-lg border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col h-fit sticky top-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-border/40 bg-white relative">
        <div className="flex items-center justify-between gap-4 min-w-0 w-full sm:w-auto">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#e8f5e9] text-[#2e7d32] shrink-0">
              <AvatarImage
                src={selectedItem.brand.logoUrl || undefined}
                className="object-cover rounded-lg"
              />
              <AvatarFallback className="bg-transparent font-bold rounded-lg text-lg">
                {brandInitials(selectedItem.brand.brandName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col justify-center gap-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-base sm:text-lg leading-none whitespace-nowrap text-foreground">
                  Order #{selectedItem.order.id.substring(0, 5).toUpperCase()}
                </h2>
                <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-50 border-0 font-semibold px-2 py-0.5 whitespace-nowrap text-[10px] sm:text-[11px] rounded-full">
                  New Request
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-none truncate mt-1">
                {brandDisplayName(selectedItem.brand.brandName)} •{" "}
                {selectedItem.order.packageNameSnapshot || "UGC Video (60s)"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="sm:hidden p-1.5 -mr-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors shrink-0"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
          <div className="flex flex-col justify-center items-start sm:items-end gap-1">
            <span className="font-bold text-base sm:text-lg leading-none text-[#22c55e]">
              {formatCreatorPayoutInr(creatorEarnings)}
            </span>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium uppercase tracking-wider leading-none">
              Payout
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {hasBrief && (
              <Button 
                onClick={() => acceptBriefMutation.mutate({ orderId: selectedOrderId })}
                disabled={acceptBriefMutation.isPending || hasTimeExceeded}
                className="bg-[#4318FF] hover:bg-[#4318FF]/90 text-white font-bold h-9 px-4 sm:h-10 sm:px-5 rounded-lg shadow-sm whitespace-nowrap text-xs sm:text-sm"
              >
                {acceptBriefMutation.isPending ? (
                  <Spinner className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                )}
                {acceptBriefMutation.isPending ? "Accepting..." : "Accept Order"}
              </Button>
            )}

            <button
              onClick={onClose}
              className="hidden sm:block p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50/50 space-y-6">
        <div className={cn(
          "border rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4",
          hasTimeExceeded 
            ? "bg-red-50 border-red-200"
            : "bg-[#fff9e6] border-[#ffe58f]"
        )}>
          <div className={cn(
            "flex items-center gap-2.5 sm:gap-3 font-medium text-xs sm:text-sm",
            hasTimeExceeded ? "text-red-700" : "text-amber-700"
          )}>
            <Clock className={cn(
              "w-4 h-4 sm:w-5 sm:h-5 shrink-0",
              hasTimeExceeded ? "text-red-500" : "text-amber-500"
            )} />
            <span>
              {hasTimeExceeded 
                ? "This order request has expired because it was not accepted in time." 
                : `You have ${timeLeft?.hours ?? 48} hrs left to accept this order.`}
            </span>
          </div>
          {timeLeft && !hasTimeExceeded && (
            <div className="flex items-center gap-2 text-amber-700 font-bold text-xs sm:text-sm bg-white/60 px-3 py-1.5 sm:py-1 rounded-md border border-amber-200/60 shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
              <span>{String(timeLeft.hours ?? 0).padStart(2, '0')}h : {String(timeLeft.minutes ?? 0).padStart(2, '0')}m : {String(timeLeft.seconds ?? 0).padStart(2, '0')}s left</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
              <div className="bg-white rounded-lg border border-border/50 p-5 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-base">Brief</h3>
                  <Button
                    variant="outline"
                    className="h-8 text-xs font-semibold px-3"
                    asChild
                  >
                    <Link href={`/creator/orders/${selectedOrderId}/brief`}>
                      View Full Brief
                    </Link>
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 mt-2">
                  <div className="grid grid-cols-[140px_1fr] items-start">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                      <Music className="w-3.5 h-3.5" /> Video Type
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {briefData?.brief?.contentType ? formatEnumLabel(briefData.brief.contentType) : selectedItem.order.packageNameSnapshot || "Not specified"}
                    </span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-start">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                      <FileText className="w-3.5 h-3.5" /> Key Notes
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {briefData?.brief?.keyNoteToInclude ? "Included in brief" : "None"}
                    </span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-start">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                      <MessageSquare className="w-3.5 h-3.5" /> Language
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {briefData?.brief?.language || "Not specified"}
                    </span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-start">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                      <Star className="w-3.5 h-3.5" /> Tone
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {briefData?.brief?.toneStyle ? formatEnumLabel(briefData.brief.toneStyle) : "Not specified"}
                    </span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-start">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Usage Rights
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      Not specified
                    </span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-start">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Deliverables
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        1{" "}
                        {selectedItem.order.packageNameSnapshot ||
                          "Deliverable"}
                      </span>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        9:16 Aspect Ratio
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-start">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                      <Clock className="w-3.5 h-3.5" /> Due Date
                    </div>
                    <DeliveryDeadlineDisplay
                      order={selectedItem.order}
                      dateClassName="text-sm font-medium text-foreground"
                      showBadge={false}
                    />
                  </div>
                </div>
              </div>

              <CreatorPayoutDetailsCard
                order={detailsData?.order ?? selectedItem.order}
                selectedItem={selectedItem}
                detailsData={detailsData}
                showBriefLink={false}
                className="bg-white rounded-lg border border-border/50 p-5 shadow-sm flex flex-col h-fit"
              />
            </div>

            <div className="bg-[#FAF9FF] rounded-lg border border-[#4318FF]/10 p-6 shadow-sm mt-4">
              <h3 className="font-bold text-base mb-6">What happens next?</h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex items-start gap-3">
                  <ClipboardCheck className="w-6 h-6 text-[#4318FF] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-2">
                    <h4 className="font-bold text-sm text-foreground">
                      1. Accept the order
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Review the brief and accept if you want to work on this
                      project.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Truck className="w-6 h-6 text-[#4318FF] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-2">
                    <h4 className="font-bold text-sm text-foreground">
                      2. Product shipped
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Brand will ship the product to your address.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileVideo className="w-6 h-6 text-[#4318FF] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-2">
                    <h4 className="font-bold text-sm text-foreground">
                      3. Create & deliver
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Create amazing content and submit for review.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Wallet className="w-6 h-6 text-[#4318FF] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-2">
                    <h4 className="font-bold text-sm text-foreground">
                      4. Get paid
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Once approved, you'll receive your payout.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

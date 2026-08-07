"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { OrderChatWidget } from "@/features/orders/components/order-chat-widget";
import { useWithdrawCreatorDisputeMutation } from "../../hooks/use-withdraw-creator-dispute-mutation";
import { CreatorPayoutDetailsCard } from "./creator-payout-details-card";

interface CreatorOrderDisputePanelProps {
  selectedOrderId: string;
  selectedItem: any;
  detailsData: any;
  briefData: any;
  isLoading: boolean;
  onClose: () => void;
  previewStepId?: string | null;
  onStepClick?: (id: string) => void;
}

function fmtDateTime(val?: string | null): string | null {
  if (!val) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(val));
  } catch {
    return null;
  }
}

function DisputeDetailsCard({
  order,
  orderId,
}: {
  order: {
    id: string;
    dispute?: { openedBy?: string; reason?: string; openedAt?: string };
  };
  orderId: string;
}) {
  const withdrawMutation = useWithdrawCreatorDisputeMutation();
  const openedByCreator = order?.dispute?.openedBy === "CREATOR";
  const reason = order?.dispute?.reason;
  const openedAt = fmtDateTime(order?.dispute?.openedAt);

  return (
    <div className="bg-amber-50 dark:bg-amber-500/5 rounded-lg border border-amber-200 dark:border-amber-500/20 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-sm mb-1">Order under dispute</h3>
          <p className="text-sm text-muted-foreground">
            {openedByCreator
              ? "You raised this dispute. Our support team is reviewing the case and will keep you updated in the group chat below."
              : "The brand raised this dispute. Our support team is reviewing the case — you can respond in the group chat below."}
          </p>
          {reason ? (
            <div className="mt-3 rounded-md border border-amber-200 dark:border-amber-500/20 bg-background/60 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                Reason
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed italic">
                &ldquo;{reason}&rdquo;
              </p>
            </div>
          ) : null}
          {openedAt ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Opened on {openedAt}
            </p>
          ) : null}

          {openedByCreator && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              disabled={withdrawMutation.isPending}
              onClick={() => withdrawMutation.mutate({ orderId })}
            >
              {withdrawMutation.isPending ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  Withdrawing...
                </>
              ) : (
                "Withdraw dispute"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CreatorOrderDisputePanel({
  selectedOrderId,
  selectedItem,
  detailsData,
  isLoading,
  onClose,
}: CreatorOrderDisputePanelProps) {
  const order = detailsData?.order ?? selectedItem?.order;

  if (!selectedItem) return null;

  return (
    <div className="bg-background rounded-xl border border-border/40 shadow-sm p-5 sm:p-6 flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Avatar className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#e8f5e9] text-[#2e7d32] shrink-0">
            <AvatarImage
              src={selectedItem.brand.logoUrl || undefined}
              className="object-cover rounded-lg"
            />
            <AvatarFallback className="bg-transparent font-bold rounded-lg text-lg">
              {selectedItem.brand.brandName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col justify-center gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-base sm:text-lg leading-none whitespace-nowrap text-foreground">
                Order #{selectedItem.order.id.substring(0, 5).toUpperCase()}
              </h2>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border-0 whitespace-nowrap",
                  "bg-amber-500/10 text-amber-600",
                )}
              >
                Disputed
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-none truncate mt-1">
              {selectedItem.brand.brandName} •{" "}
              {selectedItem.order.packageNameSnapshot || "UGC Video (60s)"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Button
            variant="outline"
            className="rounded-lg h-9 px-3.5 text-xs font-semibold border-border/50 gap-1.5"
            asChild
          >
            <Link href={`/creator/messages?orderId=${selectedOrderId}`}>
              Open in Messages
              <ExternalLink className="w-3.5 h-3.5" />
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-5">
          <DisputeDetailsCard order={order} orderId={selectedOrderId} />
          <CreatorPayoutDetailsCard
            order={order}
            selectedItem={selectedItem}
            detailsData={detailsData}
          />
        </div>

        <div className="min-w-0 lg:col-span-7">
          {isLoading ? (
            <div className="h-160 rounded-3xl border bg-card animate-pulse" />
          ) : (
            <OrderChatWidget
              orderId={selectedOrderId}
              role="creator"
              brand={selectedItem.brand}
              headerTitle="Dispute Chat"
              headerSubtitle="You, the brand and support"
              hideHeaderAvatar
            />
          )}
        </div>
      </div>
    </div>
  );
}

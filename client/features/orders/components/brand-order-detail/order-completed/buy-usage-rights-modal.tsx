"use client";

import { CalendarClock, Megaphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetBrandOrderDetailsQuery } from "../../../hooks/use-get-brand-order-details-query";
import { UsageRightsCard } from "./usage-rights-card";

type BuyUsageRightsModalProps = {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * List-row entry point for extending paid usage rights on a completed order.
 * Loads order details on open so we reuse the same purchase UI as the order page.
 */
export function BuyUsageRightsModal({
  orderId,
  open,
  onOpenChange,
}: BuyUsageRightsModalProps) {
  const { data, isLoading, isError, error } = useGetBrandOrderDetailsQuery(
    orderId,
    { enabled: open && Boolean(orderId) },
  );

  const order = data?.order;
  const canBuy =
    Boolean(order?.usageRightsAddOnAvailable) &&
    order?.usageRightsAddOnUnitPaise != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Megaphone className="size-5 text-primary" aria-hidden />
            Buy paid ads usage
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Extend how long you can use this creator&apos;s content in paid ads.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : isError || !order ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              {error?.message || "Unable to load usage-rights options for this order."}
            </div>
          ) : canBuy ? (
            <UsageRightsCard
              orderId={orderId}
              order={order}
              className="border-0 bg-transparent p-0 shadow-none"
            />
          ) : (
            <div className="flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CalendarClock className="size-4 text-muted-foreground" aria-hidden />
                Not available
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Extra usage-rights purchases aren&apos;t available for this order
                right now.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

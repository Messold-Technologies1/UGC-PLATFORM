"use client";

import { CheckCircle2, Copy, ExternalLink, MapPin, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InprogressShippingCardProps {
  courierPartner?: string;
  trackingId?: string;
  shippedAt?: string | null;
  productReceivedAt?: string | null;
}

export function InprogressShippingCard({
  courierPartner,
  trackingId,
  shippedAt,
  productReceivedAt,
}: InprogressShippingCardProps) {
  function handleCopyTrackingId() {
    if (trackingId) {
      navigator.clipboard.writeText(trackingId);
      toast.success("Tracking ID copied to clipboard");
    }
  }

  const shippedDateStr = shippedAt
    ? new Date(shippedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      ", " +
      new Date(shippedAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  const deliveredDateStr = productReceivedAt
    ? new Date(productReceivedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      ", " +
      new Date(productReceivedAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  const isDelivered = !!productReceivedAt;

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm relative">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-foreground">Shipping Details</h3>
        <Badge
          variant="secondary"
          className={cn(
            "pointer-events-none rounded-full px-3 py-1 font-semibold border-none",
            isDelivered
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
          )}
        >
          {isDelivered ? "Delivered to creator" : "In Transit"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
            <span className="text-muted-foreground">Courier Partner</span>
            <span className="font-medium">
              {courierPartner || "Not provided"}
            </span>
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
            <span className="text-muted-foreground">Tracking ID</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {trackingId || "Not provided"}
              </span>
              {trackingId && (
                <button
                  type="button"
                  onClick={handleCopyTrackingId}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
            <span className="text-muted-foreground">Shipped On</span>
            <span className="font-medium">{shippedDateStr || "N/A"}</span>
          </div>
        </div>

        <div className="flex flex-col ml-4">
          <div className="flex gap-3 relative">
            <div className="flex flex-col items-center">
              <div className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 z-10">
                <CheckCircle2 className="size-4" />
              </div>
              <div
                className={cn(
                  "w-0.5 h-8",
                  isDelivered
                    ? "bg-emerald-200 dark:bg-emerald-800"
                    : "bg-border",
                )}
              />
            </div>
            <div className="pb-4">
              <p className="text-sm font-semibold text-foreground">Shipped</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {shippedDateStr || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex gap-3 relative">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded-full z-10",
                  isDelivered
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-blue-100 text-blue-600 border border-blue-200",
                )}
              >
                {isDelivered ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <div className="size-2 rounded-full bg-blue-600" />
                )}
              </div>
              <div className="w-0.5 h-8 bg-border" />
            </div>
            <div className="pb-4">
              <p
                className={cn(
                  "text-sm font-medium",
                  isDelivered
                    ? "text-muted-foreground"
                    : "text-foreground font-semibold",
                )}
              >
                In Transit
              </p>
            </div>
          </div>

          <div className="flex gap-3 relative">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded-full z-10",
                  isDelivered
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-muted border-2 border-border text-muted-foreground",
                )}
              >
                {isDelivered ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <div className="size-2 rounded-full bg-muted-foreground/50" />
                )}
              </div>
            </div>
            <div>
              <p
                className={cn(
                  "text-sm font-medium",
                  isDelivered
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground",
                )}
              >
                Delivered
              </p>
              {isDelivered && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {deliveredDateStr}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center h-full">
          {isDelivered ? (
            <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-4 w-full">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    Creator marked the product as received.
                  </p>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                    {deliveredDateStr}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 p-4 w-full">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
                  <Truck className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                    Product is on the way
                  </p>
                  <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                    Awaiting creator confirmation
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

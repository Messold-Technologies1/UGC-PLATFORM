"use client";

import { CheckCircle2, Copy, ExternalLink, MapPin, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InprogressShippingCardProps {
  courierPartner?: string;
  trackingId?: string;
  shippedAt?: string | null;
}

export function InprogressShippingCard({
  courierPartner = "Delhivery",
  trackingId = "1234567890123",
  shippedAt = "2025-05-12T16:30:00Z",
}: InprogressShippingCardProps) {
  function handleCopyTrackingId() {
    if (trackingId) {
      navigator.clipboard.writeText(trackingId);
      toast.success("Tracking ID copied to clipboard");
    }
  }

  // Formatting dates roughly as in design
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

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm relative">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-foreground">Shipping Details</h3>
        <Badge
          variant="secondary"
          className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 pointer-events-none rounded-full px-3 py-1 font-semibold border-none"
        >
          Delivered to creator
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
            <span className="text-muted-foreground">Courier Partner</span>
            <span className="font-medium">{courierPartner}</span>
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
            <span className="text-muted-foreground">Tracking ID</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{trackingId}</span>
              <button
                type="button"
                onClick={handleCopyTrackingId}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
            <span className="text-muted-foreground">Shipped On</span>
            <span className="font-medium">{shippedDateStr}</span>
          </div>

          <div className="pt-2">
            <a
              href="#"
              className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
            >
              Track Shipment <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>

        {/* Middle Column: Timeline */}
        <div className="flex flex-col ml-4">
          <div className="flex gap-3 relative">
            <div className="flex flex-col items-center">
              <div className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 z-10">
                <CheckCircle2 className="size-4" />
              </div>
              <div className="w-0.5 h-8 bg-border" />
            </div>
            <div className="pb-4">
              <p className="text-sm font-semibold text-foreground">Shipped</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {shippedDateStr || "12 May 2025, 04:30 PM"}
              </p>
            </div>
          </div>

          <div className="flex gap-3 relative">
            <div className="flex flex-col items-center">
              <div className="flex size-6 items-center justify-center rounded-full bg-muted border-2 border-border text-muted-foreground z-10">
                <div className="size-2 rounded-full bg-muted-foreground/50" />
              </div>
              <div className="w-0.5 h-8 bg-border" />
            </div>
            <div className="pb-4">
              <p className="text-sm font-medium text-muted-foreground">In Transit</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                13 May 2025, 09:10 AM
              </p>
            </div>
          </div>

          <div className="flex gap-3 relative">
            <div className="flex flex-col items-center">
              <div className="flex size-6 items-center justify-center rounded-full bg-muted border-2 border-border text-muted-foreground z-10">
                <div className="size-2 rounded-full bg-muted-foreground/50" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Delivered</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                14 May 2025, 11:10 AM
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Status box */}
        <div className="flex items-center justify-center h-full">
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
                  14 May 2025, 11:15 AM
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

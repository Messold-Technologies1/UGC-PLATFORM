"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Briefcase,
  Clipboard,
  MonitorPlay,
  BadgeCheck,
  Video,
  Key,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrderBriefPayload } from "../../../api/get-order-brief";
import type { OrderDetailsPublic } from "../../../api/types";
import { formatBriefScript } from "@/features/briefs/lib/format-brief-script";
import { Badge } from "@/components/ui/badge";
import {
  DeliveryDeadlineDisplay,
  formatDeliveryDate,
} from "../../delivery-deadline-display";
import { getPromisedDeliveryDueAt } from "../../../lib/delivery-timeline";

interface InprogressOrderDetailsCardProps {
  order: OrderDetailsPublic;
  brief?: OrderBriefPayload | null;
  briefId?: string | null;
  orderId: string;
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

export function InprogressOrderDetailsCard({
  order,
  brief,
  briefId,
  orderId,
}: InprogressOrderDetailsCardProps) {
  const router = useRouter();

  const promisedDueDate = useMemo(() => {
    const due = getPromisedDeliveryDueAt(order);
    return due ? formatDeliveryDate(due.toISOString()) : null;
  }, [order]);

  const brandName = brief?.brandName ?? "Not specified";
  const productName = brief?.productName ?? "Not specified";
  const contentTypes = brief?.contentType
    ? formatEnumLabel(brief.contentType)
    : "Product Demo • Instagram Reels";
  const durationBucketLabels: Record<string, string> = {
    SEC_0_15: "0 - 15 Seconds",
    SEC_15_30: "15 - 30 Seconds",
    SEC_30_45: "30 - 45 Seconds",
    SEC_45_60: "45 - 60 Seconds",
    SEC_60_100: "60 - 100 Seconds",
    NOT_SURE: "Not sure / Creator decides",
  };

  const durationBucket = brief?.durationBucket
    ? durationBucketLabels[brief.durationBucket] ||
      formatEnumLabel(brief.durationBucket)
    : "Up to 60 seconds";
  const style = "Casual, Bright, Energetic";
  const scriptSummary = formatBriefScript(brief?.script);

  function handleViewFullBrief() {
    if (briefId) {
      router.push(`/brand/briefs/${briefId}`);
    }
  }
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between pb-5 border-b border-border/60 mb-6">
        <h3 className="text-lg font-bold text-foreground">Order Details</h3>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-[1.2] space-y-8">
          <div className="grid grid-cols-[150px_1fr] gap-y-4 gap-x-4 items-center">
            <div className="flex items-center gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Briefcase className="size-3.5" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground">
                Brand
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {brandName}
            </span>

            <div className="flex items-center gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clipboard className="size-3.5" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground">
                Product
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {productName}
            </span>

            <div className="flex items-center gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MonitorPlay className="size-3.5" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground">
                Content Type
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {contentTypes}
            </span>

            <div className="flex items-center gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BadgeCheck className="size-3.5" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground">
                Style
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">{style}</span>

            <div className="flex items-center gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Video className="size-3.5" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground">
                Video Length
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {durationBucket}
            </span>

            <div className="flex items-start gap-3 self-start mt-1">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Key className="size-3.5" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground mt-1">
                Key Points
              </span>
            </div>
            <span className="text-sm font-medium text-foreground whitespace-pre-wrap self-start mt-2">
              {brief?.keyNoteToInclude || "Not specified"}
            </span>
          </div>

          <Button
            variant="outline"
            className="w-full text-primary border-primary/20 hover:bg-primary/5 rounded-xl font-semibold"
            onClick={handleViewFullBrief}
            disabled={!briefId}
          >
            View Full Brief
          </Button>
        </div>

        <div className="hidden md:block w-px bg-border/60" />

        <div className="flex-1 space-y-8 md:pl-2">
          <div>
            <h4 className="text-sm font-bold text-foreground mb-4">
              Deliverables
            </h4>
            <div className="space-y-3">
              {order.deliverablesSnapshot &&
              order.deliverablesSnapshot.length > 0 ? (
                order.deliverablesSnapshot.map((deliverable, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2.5 text-sm"
                  >
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span className="text-foreground font-medium">
                      {deliverable}
                    </span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span className="text-foreground font-medium">
                      1 UGC Video ({durationBucket})
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span className="text-foreground font-medium">
                      9:16 Aspect Ratio
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span className="text-foreground font-medium">
                      High Quality (1080p)
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span className="text-foreground font-medium">
                      No Watermark
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span className="text-foreground font-medium">
                      Raw Footage (Upon Request)
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-foreground mb-4">Add-ons</h4>
            <div className="flex flex-wrap gap-2.5">
              {order.addOnsSnapshot.length > 0 ? (
                order.addOnsSnapshot.map((addon) => (
                  <Badge
                    key={addon.id}
                    variant="secondary"
                    className="bg-muted/60 text-foreground font-medium rounded-lg px-3 py-1.5 text-xs"
                  >
                    {addon.name}
                  </Badge>
                ))
              ) : (
                <>
                  <Badge
                    variant="secondary"
                    className="bg-muted/60 text-foreground font-medium rounded-lg px-3 py-1.5 text-xs"
                  >
                    Faster Delivery (3 Days)
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-muted/60 text-foreground font-medium rounded-lg px-3 py-1.5 text-xs"
                  >
                    Script Writing
                  </Badge>
                </>
              )}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3.5 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Clock className="size-3.5 shrink-0" />
                  Delivery deadline
                </div>
                {order.deliveredAt ? (
                  <span className="text-sm font-semibold text-foreground">
                    {promisedDueDate ?? "—"}
                  </span>
                ) : (
                  <DeliveryDeadlineDisplay
                    order={order}
                    dateClassName="text-sm font-semibold text-foreground"
                  />
                )}
              </div>

              {order.deliveredAt ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3.5 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                    Delivered on
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {formatDeliveryDate(order.deliveredAt) ?? "—"}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

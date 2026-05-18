"use client";

import {
  Package,
  Truck,
  CheckCircle2,
  PlayCircle,
  BadgeInfo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function ShippingTimelineCard() {
  const steps = [
    {
      id: "awaiting_shipment",
      title: "Awaiting Shipment",
      description: "Please ship the product to the creator.",
      icon: Package,
      status: "current",
    },
    {
      id: "shipped",
      title: "Shipped",
      description: "You will be able to track the shipment.",
      icon: Truck,
      status: "pending",
    },
    {
      id: "product_received",
      title: "Product Received",
      description: "Creator will confirm once the product is received.",
      icon: CheckCircle2,
      status: "pending",
    },
    {
      id: "in_progress",
      title: "In Progress",
      description: "Creator will start working on your content.",
      icon: PlayCircle,
      status: "pending",
    },
  ];

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-bold text-foreground mb-6">
        Shipping Timeline
      </h3>

      <div className="flex flex-col">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const isCurrent = step.status === "current";
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex gap-4 relative">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border-2 z-10",
                    isCurrent
                      ? "bg-purple-100 border-purple-200 text-purple-600 dark:bg-purple-900/30 dark:border-purple-500/30 dark:text-purple-400"
                      : "bg-muted border-border text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 my-2 border-l-2 border-dashed border-border",
                    )}
                  />
                )}
              </div>

              <div className={cn("pb-8 flex-1", isLast && "pb-0")}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        isCurrent ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  </div>
                  {isCurrent && (
                    <Badge
                      variant="secondary"
                      className="bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 pointer-events-none rounded-full px-2.5 py-0.5 text-[10px] font-semibold border border-purple-200 dark:border-purple-800"
                    >
                      Current Step
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

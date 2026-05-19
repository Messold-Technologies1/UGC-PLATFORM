"use client";

import { CalendarClock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardUpcomingDelivery } from "../mock/dashboard-mock-data";

interface Props {
  deliveries: DashboardUpcomingDelivery[];
}

export function DashboardUpcomingDeliveries({ deliveries }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-bold text-foreground">Upcoming Deliveries</h2>
        <CalendarClock className="size-4 text-muted-foreground" />
      </div>
      <div className="divide-y divide-border">
        {deliveries.map((d) => (
          <div
            key={d.orderId}
            className="flex items-center justify-between px-5 py-3.5 hover:bg-accent/30 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {d.brandName}
              </p>
              <p className="text-xs text-muted-foreground">{d.packageName}</p>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0 ml-4">
              <span className="text-xs text-muted-foreground">{d.dueDate}</span>
              <span
                className={cn(
                  "text-xs font-bold",
                  d.urgent ? "text-red-500" : d.daysLeft <= 4 ? "text-orange-500" : "text-emerald-600"
                )}
              >
                {d.urgent && <AlertCircle className="inline size-3 mr-0.5" />}
                {d.daysLeft}d left
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

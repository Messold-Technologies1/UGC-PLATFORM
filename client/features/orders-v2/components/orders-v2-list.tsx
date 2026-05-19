"use client";

import { cn } from "@/lib/utils";
import { Package } from "lucide-react";
import { BrandAvatar, StatusBadge } from "@/features/creator-ui";
import {
  ORDER_V2_STATUS_COLORS,
  ORDER_V2_STATUS_LABELS,
  BRAND_AVATAR_CONFIG,
} from "../constants";
import type { OrderV2Item } from "../mock/orders-v2-mock-data";

interface Props {
  orders: OrderV2Item[];
  selectedId: string | null;
  onSelect: (order: OrderV2Item) => void;
}

function resolveBrand(name: string) {
  return BRAND_AVATAR_CONFIG[name] ?? { initials: name[0], bgClass: "bg-slate-500" };
}

export function OrdersV2List({ orders, selectedId, onSelect }: Props) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <Package className="size-10 opacity-30" />
        <p className="text-sm font-medium">No orders found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {orders.map((order) => {
        const brand = resolveBrand(order.brand.name);
        return (
          <button
            key={order.id}
            onClick={() => onSelect(order)}
            className={cn(
              "flex items-center gap-3 p-4 w-full text-left transition-colors hover:bg-accent/50",
              selectedId === order.id
                ? "bg-accent border-l-2 border-l-primary"
                : "border-l-2 border-l-transparent"
            )}
          >
            <BrandAvatar initials={brand.initials} bgClass={brand.bgClass} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span className="text-sm font-bold text-foreground">#{order.id}</span>
                {order.isNew && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-violet-500 text-white">
                    NEW
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {order.brand.name} · {order.packageName}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {order.deliveryLabel}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <StatusBadge colorClass={ORDER_V2_STATUS_COLORS[order.status]}>
                {ORDER_V2_STATUS_LABELS[order.status]}
              </StatusBadge>
              <span className="text-sm font-bold text-foreground">
                {order.payout > 0
                  ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(order.payout)
                  : "—"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandAvatar, StatusBadge } from "@/features/creator-ui";
import type { DashboardActiveOrder } from "../mock/dashboard-mock-data";

interface Props {
  orders: DashboardActiveOrder[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

export function DashboardOrdersTable({ orders }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-bold text-foreground">Active Orders</h2>
        <a
          href="/creator/orders-v2"
          className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
        >
          View all <ArrowRight className="size-3" />
        </a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Order ID", "Brand", "Package", "Status", "Delivery", "Payout"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                  #{order.id}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <BrandAvatar
                      initials={order.brandInitials}
                      bgClass={order.brandBgClass}
                      size="xs"
                    />
                    <span className="font-medium text-foreground whitespace-nowrap">
                      {order.brandName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {order.packageName}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge colorClass={order.statusColor}>{order.status}</StatusBadge>
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {order.deliveryDate}
                </td>
                <td className="px-4 py-3 font-bold text-foreground whitespace-nowrap">
                  {fmt(order.payout)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { Copy, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { OrderDetailsPublic } from "../../api/types";

interface OrderDetailsCardProps {
  order: OrderDetailsPublic;
}

function formatOrderDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function OrderDetailsCard({ order }: OrderDetailsCardProps) {
  const displayId =
    order.id.length > 10 ? order.id.slice(0, 8).toUpperCase() : order.id;
  const isPaid = Boolean(order.paidAt);

  function handleCopyOrderId() {
    navigator.clipboard
      .writeText(order.id)
      .then(() => {
        toast.success("Order ID copied");
      })
      .catch(() => {
        toast.error("Failed to copy");
      });
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <h3 className="text-base font-bold text-foreground">Order Details</h3>

      <dl className="mt-4 space-y-3.5 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Order ID</dt>
          <dd className="flex items-center gap-1.5 font-medium text-foreground">
            {displayId}
            <button
              type="button"
              onClick={handleCopyOrderId}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
              aria-label="Copy order ID"
            >
              <Copy className="size-3" />
            </button>
          </dd>
        </div>

        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Order Date</dt>
          <dd className="font-medium text-foreground">
            {formatOrderDate(order.paidAt || order.createdAt)}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Payment Method</dt>
          <dd className="font-medium text-foreground">UPI</dd>
        </div>

        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Payment Status</dt>
          <dd>
            <Badge
              variant="outline"
              className={
                isPaid
                  ? "rounded-full bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 text-xs font-semibold"
                  : "rounded-full bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 text-xs font-semibold"
              }
            >
              {isPaid ? "Paid" : "Pending"}
            </Badge>
          </dd>
        </div>
      </dl>

      <Button
        variant="outline"
        className="w-full mt-5 rounded-lg text-sm font-medium"
        disabled
      >
        <Download className="size-4" />
        Download Invoice
      </Button>
    </div>
  );
}

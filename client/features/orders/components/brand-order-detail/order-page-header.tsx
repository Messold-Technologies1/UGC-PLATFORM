"use client";

import Link from "next/link";
import { ArrowLeft, Copy, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface OrderPageHeaderProps {
  orderId: string;
  paidAt?: string | null;
}

function formatOrderDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) +
    " • " +
    date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
}

export function OrderPageHeader({ orderId, paidAt }: OrderPageHeaderProps) {
  const displayId = orderId.length > 10 ? orderId.slice(0, 10) : orderId;

  function handleCopyOrderId() {
    navigator.clipboard.writeText(orderId).then(() => {
      toast.success("Order ID copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy order ID");
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Link
        href="/brand/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-4" />
        Back to Orders
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Order #{displayId}
            </h1>
            <button
              type="button"
              onClick={handleCopyOrderId}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
              aria-label="Copy order ID"
            >
              <Copy className="size-4" />
            </button>
          </div>
          {paidAt ? (
            <p className="text-sm text-muted-foreground mt-0.5">
              Placed on {formatOrderDate(paidAt)}
            </p>
          ) : null}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="rounded-lg border-border/60 text-sm font-medium shrink-0"
          disabled
        >
          <HelpCircle className="size-4" />
          Need Help?
        </Button>
      </div>
    </div>
  );
}

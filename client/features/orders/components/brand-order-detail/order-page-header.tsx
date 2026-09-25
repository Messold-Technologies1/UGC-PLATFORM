"use client";

import Link from "next/link";
import { ArrowLeft, Copy, MessageCircle } from "lucide-react";
import { ContactSupportButton } from "@/components/contact-support-dialog";
import { toast } from "sonner";
import type { OrderDetailsPublic } from "@/features/orders/api/types";
import { RaiseDisputeButton } from "../raise-dispute-button";

interface OrderPageHeaderProps {
  orderId: string;
  paidAt?: string | null;
  completedAt?: string | null;
  /** Drives the "Raise a Dispute" action; omit to hide it. */
  order?: Pick<OrderDetailsPublic, "status" | "dispute">;
}

function formatOrderDate(value?: string | null, hideTime?: boolean) {
  if (!value) return null;
  const date = new Date(value);
  const dateStr = date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (hideTime) return dateStr;
  return dateStr +
    " • " +
    date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
}

export function OrderPageHeader({
  orderId,
  paidAt,
  completedAt,
  order,
}: Readonly<OrderPageHeaderProps>) {
  const displayId = orderId.length > 10 ? orderId.slice(0, 10) : orderId;

  function handleCopyOrderId() {
    navigator.clipboard.writeText(orderId).then(() => {
      toast.success("Order ID copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy order ID");
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
        <Link
          href="/brand/orders"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="size-4" />
          Back to Orders
        </Link>

        <span className="hidden sm:inline text-muted-foreground/40 text-sm">
          /
        </span>

        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h1 className="text-xl font-bold tracking-tight whitespace-nowrap">
            Order #{displayId}
          </h1>
          <button
            type="button"
            onClick={handleCopyOrderId}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted shrink-0"
            aria-label="Copy order ID"
          >
            <Copy className="size-4" />
          </button>
          {completedAt ? (
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              Completed on {formatOrderDate(completedAt, true)}
            </p>
          ) : paidAt ? (
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              Placed on {formatOrderDate(paidAt)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <ContactSupportButton
          className="h-10 shrink-0 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 px-4 text-sm font-medium"
          defaultSubject="Order support"
        >
          <MessageCircle className="size-4" />
          Need Help
        </ContactSupportButton>
        {order ? (
          <RaiseDisputeButton orderId={orderId} order={order} role="brand" />
        ) : null}
      </div>
    </div>
  );
}

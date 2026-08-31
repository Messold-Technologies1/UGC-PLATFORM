"use client";

import Link from "next/link";
import { ArrowLeft, Copy, Download, FileText, HelpCircle, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface OrderPageHeaderProps {
  orderId: string;
  paidAt?: string | null;
  completedAt?: string | null;
  status?: string;
  packageDescription?: string;
  showBriefDownload?: boolean;
  showInvoice?: boolean;
}

const STATUS_BADGE_MAP: Record<string, { label: string; className: string }> = {
  DELIVERED: {
    label: "Delivered",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  },
  REVISION_REQUESTED: {
    label: "Revision Requested",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  },
  REVISION_SUBMITTED: {
    label: "Revision Submitted",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  },
  ACCEPTED: {
    label: "Completed",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  },
  CREATOR_PAYMENT_DONE: {
    label: "Completed",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  },
  REJECTED: {
    label: "Cancelled",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  },
  REFUNDED: {
    label: "Cancelled",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  },
};

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
  status,
  packageDescription,
  showBriefDownload,
  showInvoice,
}: OrderPageHeaderProps) {
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
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">
              Order #{displayId}
            </h1>
            {status && STATUS_BADGE_MAP[status] && (
              <Badge
                variant="outline"
                className={`rounded-full text-xs font-semibold px-2.5 py-0.5 ${STATUS_BADGE_MAP[status].className}`}
              >
                {STATUS_BADGE_MAP[status].label}
              </Badge>
            )}
            <button
              type="button"
              onClick={handleCopyOrderId}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
              aria-label="Copy order ID"
            >
              <Copy className="size-4" />
            </button>
          </div>
          {completedAt ? (
            <p className="text-sm text-muted-foreground mt-0.5">
              Completed on {formatOrderDate(completedAt, true)}
              {packageDescription ? ` • ${packageDescription}` : ""}
            </p>
          ) : paidAt ? (
            <p className="text-sm text-muted-foreground mt-0.5">
              Placed on {formatOrderDate(paidAt)}
              {packageDescription ? ` • ${packageDescription}` : ""}
            </p>
          ) : null}
        </div>

        {/* <div className="flex items-center gap-2 shrink-0">
          {showBriefDownload && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border-border/60 text-sm font-medium"
              disabled
            >
              <Download className="size-4" />
              Download Brief
            </Button>
          )}
          {showInvoice && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border-border/60 text-sm font-medium"
              disabled
            >
              <FileText className="size-4" />
              View Invoice
            </Button>
          )}
          {!showBriefDownload && !showInvoice && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border-border/60 text-sm font-medium"
              disabled
            >
              <HelpCircle className="size-4" />
              Need Help?
            </Button>
          )}
          {(showBriefDownload || showInvoice) && (
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-lg text-muted-foreground"
            >
              <MoreVertical className="size-4" />
            </Button>
          )}
        </div> */}
      </div>
    </div>
  );
}

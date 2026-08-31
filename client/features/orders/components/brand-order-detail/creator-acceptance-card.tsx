"use client";

import { CheckCircle2, Hourglass, Send, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { OrderCreatorSnapshot, OrderDetailsPublic } from "../../api/types";

interface CreatorAcceptanceCardProps {
  creator?: OrderCreatorSnapshot;
  order: OrderDetailsPublic;
}

const ACCEPTED_STATUSES = [
  "BRIEF_ACCEPTED",
  "PRODUCT_SHIPPED",
  "PRODUCT_RECEIVED",
  "DELIVERED",
  "REVISION_REQUESTED",
  "REVISION_SUBMITTED",
  "ACCEPTED",
  "CREATOR_PAYMENT_DONE",
];

export function CreatorAcceptanceCard({
  creator,
  order,
}: CreatorAcceptanceCardProps) {
  const creatorName = creator?.displayName ?? "Creator";

  const isCancelled =
    order.status === "REJECTED" || order.status === "REFUNDED";
  const isAwaitingPayment = order.status === "PENDING_PAYMENT";
  const isAccepted = ACCEPTED_STATUSES.includes(order.status) || !!order.briefAcceptedAt;
  const isAwaitingAcceptance = order.status === "BRIEF_SUBMITTED" || (!!order.briefSubmittedAt && !order.briefAcceptedAt);
  const isPendingBrief =
    !isCancelled && !isAwaitingPayment && !isAwaitingAcceptance && !isAccepted;

  if (isCancelled) {
    const rejectedByCreator = order.cancelledBy === "CREATOR";
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
            <XCircle className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              {rejectedByCreator ? "Order rejected" : "Order cancelled"}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {rejectedByCreator
                ? `${creatorName} declined this order. Any amount paid will be refunded.`
                : "This order has been cancelled. Any amount paid will be refunded."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Brief Accepted
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {creatorName} has accepted your project and is working on it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isAwaitingPayment) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Send className="size-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Creator Acceptance
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Complete payment above to unlock brief submission.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <Button
            disabled
            className="w-full bg-[#6E42FF] text-white opacity-60 cursor-not-allowed"
          >
            Submit Brief
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Available after payment is complete
          </p>
        </div>
      </div>
    );
  }

  if (isPendingBrief) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Send className="size-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Creator Acceptance
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Submit your brief to start the acceptance window.
            </p>
          </div>
        </div>

        <div className="mt-5">
          {["DISPUTED", "REFUNDED", "REJECTED"].includes(order.status) ? (
            <Button
              disabled
              className="w-full bg-[#6E42FF] text-white opacity-60 cursor-not-allowed"
            >
              Submit Brief
            </Button>
          ) : (
            <Button
              asChild
              className="w-full bg-[#6E42FF] hover:bg-[#5b33d6] text-white"
            >
              <Link href={`/brand/briefs/create?orderId=${order.id}`}>
                Submit Brief
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-card p-6 shadow-sm relative overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Hourglass className="size-4" />
          <span
            className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping"
            style={{ animationDuration: "2s" }}
          />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">
            Awaiting Creator Acceptance
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {creatorName} is reviewing your project. You&apos;ll be notified as
            soon as they accept.
          </p>
        </div>
      </div>
    </div>
  );
}

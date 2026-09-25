"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OrderDetailsPublic } from "@/features/orders/api/types";
import { useOpenBrandDisputeMutation } from "../hooks/use-open-brand-dispute-mutation";
import { useOpenCreatorDisputeMutation } from "../hooks/use-open-creator-dispute-mutation";
import { ReasonPromptDialog } from "./reason-prompt-dialog";

/**
 * Order states the server refuses to dispute (see `OrdersService.openDispute`)
 * — the button is hidden rather than letting the request fail.
 */
const NON_DISPUTABLE_STATUSES = new Set([
  "PENDING_PAYMENT",
  "CREATOR_PAYMENT_DONE",
  "REFUNDED",
  "REJECTED",
  "CANCELLED_CREDITED",
]);

interface RaiseDisputeButtonProps {
  orderId: string;
  order: Pick<OrderDetailsPublic, "status" | "dispute">;
  role: "brand" | "creator";
  className?: string;
}

/**
 * "Raise a Dispute" trigger shown beside "Need Help" on the brand and creator
 * order pages. Collects a reason and opens the dispute for the caller's side,
 * which moves the order to DISPUTED and starts the support group chat.
 */
export function RaiseDisputeButton({
  orderId,
  order,
  role,
  className,
}: Readonly<RaiseDisputeButtonProps>) {
  const [isOpen, setIsOpen] = useState(false);

  const brandMutation = useOpenBrandDisputeMutation({
    onSuccess: () => setIsOpen(false),
  });
  const creatorMutation = useOpenCreatorDisputeMutation({
    onSuccess: () => setIsOpen(false),
  });
  const mutation = role === "brand" ? brandMutation : creatorMutation;

  // Only one dispute can be open at a time, so an order already in dispute
  // has nothing to raise — the dispute view owns that state.
  const hasOpenDispute =
    order.status === "DISPUTED" || order.dispute?.status === "OPEN";
  if (hasOpenDispute || NON_DISPUTABLE_STATUSES.has(order.status)) return null;

  const counterparty = role === "brand" ? "creator" : "brand";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-10 shrink-0 rounded-xl border-amber-200 px-4 text-sm font-medium text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/10",
          className,
        )}
        onClick={() => setIsOpen(true)}
      >
        <ShieldAlert className="size-4" />
        Raise a Dispute
      </Button>

      <ReasonPromptDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Raise a dispute?"
        description={`Our support team will review this order along with you and the ${counterparty} in a group chat. The order is paused until the dispute is resolved.`}
        label="What went wrong?"
        placeholder={`Tell us what happened with this order…`}
        confirmLabel="Raise Dispute"
        pendingLabel="Raising..."
        isPending={mutation.isPending}
        minLength={10}
        onConfirm={(reason) => mutation.mutate({ orderId, reason })}
      />
    </>
  );
}

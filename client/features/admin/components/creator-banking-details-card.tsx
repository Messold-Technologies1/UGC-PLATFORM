"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CLARITY_MASK } from "@/lib/clarity";
import type { AdminCreatorPayoutDetailsDto } from "@/features/admin/types";
import { adminCreatorPayoutDetailsQueryKey } from "@/features/admin/api/fetch-admin-creator-payout-details";
import { useAdminCreatorPayoutDetailsQuery } from "@/features/admin/hooks/use-admin-creator-payout-details-query";

function hasCreatorPayoutDetails(
  details: AdminCreatorPayoutDetailsDto,
): boolean {
  return !!(
    details.accountNumber?.trim() ||
    details.upiId?.trim() ||
    details.accountHolderName?.trim() ||
    details.ifsc?.trim()
  );
}

function CopyableField({ id, label }: { id?: string | null; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!id) return;
    await navigator.clipboard.writeText(id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="group">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <button
        type="button"
        onClick={() => void handleCopy()}
        disabled={!id}
        className="flex w-full items-center justify-between rounded-lg border border-transparent bg-secondary/40 p-2.5 text-left transition-all duration-200 hover:border-border/50 hover:bg-secondary/80 disabled:cursor-default disabled:hover:border-transparent disabled:hover:bg-secondary/40"
      >
        <span className="truncate font-mono text-sm" {...CLARITY_MASK}>
          {id}
        </span>
        {copied ? (
          <span className="shrink-0 text-xs font-medium text-emerald-600">
            Copied
          </span>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            Copy
          </span>
        )}
      </button>
    </div>
  );
}

type CreatorBankingDetailsCardProps = {
  creatorId: string;
};

export function CreatorBankingDetailsCard({
  creatorId,
}: CreatorBankingDetailsCardProps) {
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState(false);
  const {
    data: payoutDetails,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useAdminCreatorPayoutDetailsQuery(creatorId, revealed);

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleHide = () => {
    setRevealed(false);
    queryClient.removeQueries({
      queryKey: adminCreatorPayoutDetailsQueryKey(creatorId),
    });
  };

  return (
    <div className="space-y-4">
      {!revealed ? (
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-start rounded-xl"
          onClick={handleReveal}
        >
          <Eye className="h-4 w-4" />
          View payment details
        </Button>
      ) : isLoading || isFetching ? (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : isError ? (
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-xl"
            onClick={() => void refetch()}
          >
            Retry
          </Button>
        </div>
      ) : payoutDetails && hasCreatorPayoutDetails(payoutDetails) ? (
        <>
          {payoutDetails.accountHolderName ? (
            <CopyableField
              id={payoutDetails.accountHolderName}
              label="Account holder name"
            />
          ) : null}
          {payoutDetails.accountNumber ? (
            <CopyableField
              id={payoutDetails.accountNumber}
              label="Account number"
            />
          ) : null}
          {payoutDetails.ifsc ? (
            <CopyableField id={payoutDetails.ifsc} label="IFSC" />
          ) : null}
          {payoutDetails.upiId ? (
            <CopyableField id={payoutDetails.upiId} label="UPI ID" />
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full rounded-xl text-muted-foreground"
            onClick={handleHide}
          >
            <EyeOff className="h-4 w-4" />
            Hide details
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="h-10 w-full rounded-xl text-muted-foreground"
          onClick={handleHide}
        >
          <EyeOff className="h-4 w-4" />
          Hide
        </Button>
      )}
    </div>
  );
}

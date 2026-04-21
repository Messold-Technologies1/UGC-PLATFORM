"use client";

import Link from "next/link";
import { ArrowRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { useCreatorPayoutDetailsQuery } from "@/features/creators/hooks/use-creator-payout-details-query";

const PAYOUT_SETUP_HREF = "/creator/account";

export function CreatorPayoutDetailsBanner() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: payoutDetails, isLoading: isPayoutLoading } = useCreatorPayoutDetailsQuery({
    enabled: !!user,
  });

  if (isAuthLoading || isPayoutLoading || !user) return null;
  if (payoutDetails?.hasBankDetails || payoutDetails?.hasUpi) return null;

  return (
    <div
      className="rounded-2xl border border-border bg-muted/30 px-4 py-4 sm:px-5"
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground/10">
            <Wallet className="size-5 text-foreground" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Add your payout details
            </p>
            <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">
              You need to configure your bank account or UPI ID to receive payments from brands. Add them securely now.
            </p>
          </div>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link href={PAYOUT_SETUP_HREF} prefetch className="gap-2">
            Configure Payouts
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}

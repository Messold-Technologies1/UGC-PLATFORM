"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { useCreatorPayoutDetailsQuery } from "@/features/creators/hooks/use-creator-payout-details-query";

const PAYOUT_SETUP_HREF = "/creator/account#payment-details";

export function CreatorPayoutDetailsBanner() {
  const pathname = usePathname();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: payoutDetails, isLoading: isPayoutLoading } = useCreatorPayoutDetailsQuery({
    enabled: !!user,
  });

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/creator/account") {
      e.preventDefault();
      document.getElementById("payment-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (isAuthLoading || isPayoutLoading || !user) return null;
  if (payoutDetails?.hasBankDetails || payoutDetails?.hasUpi) return null;

  return (
    <div
      className="rounded-sm bg-foreground text-background px-4 py-3 sm:px-5 shadow-lg"
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3 sm:gap-4 items-center sm:items-start">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background/20">
            <Wallet className="size-4 text-background" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-background leading-tight">
              Add your payout details
            </p>
            <p className="mt-0.5 max-w-xl text-xs text-background/80">
              You need to configure your bank account or UPI ID to receive payments from brands. Add them securely now.
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="w-full shrink-0 sm:w-auto bg-background text-foreground hover:bg-background/90 h-9">
          <Link href={PAYOUT_SETUP_HREF} onClick={handleScroll} prefetch className="gap-2">
            Configure Payouts
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}

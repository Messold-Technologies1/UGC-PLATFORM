"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLATFORM_FEE_RATE } from "@/features/creators/hooks/creator-profile-form-utils";
import {
  formatCreatorPayoutInr,
  getCreatorPayoutFromOrderTotal,
  resolveOrderTotalInr,
} from "../../lib/creator-payout";

type CreatorPayoutDetailsCardProps = {
  order?: {
    id?: string;
    expectedAmountPaise?: number | null;
    priceAmountSnapshot?: string | null;
    addOnsTotalSnapshot?: string | number | null;
    addOnsSnapshot?: unknown[] | null;
  } | null;
  selectedItem?: {
    order?: {
      id?: string;
      expectedAmountPaise?: number | null;
      priceAmountSnapshot?: string | null;
    };
  } | null;
  detailsData?: {
    order?: {
      expectedAmountPaise?: number | null;
      priceAmountSnapshot?: string | null;
      addOnsTotalSnapshot?: string | number | null;
      addOnsSnapshot?: unknown[] | null;
    };
  } | null;
  title?: string;
  showBriefLink?: boolean;
  className?: string;
};

export function CreatorPayoutDetailsCard({
  order,
  selectedItem,
  detailsData,
  title = "Payout Details",
  showBriefLink = true,
  className,
}: CreatorPayoutDetailsCardProps) {
  const sourceOrder = detailsData?.order ?? order ?? selectedItem?.order;

  const orderTotal = resolveOrderTotalInr({
    expectedAmountPaise: sourceOrder?.expectedAmountPaise,
    priceAmountSnapshot:
      sourceOrder?.priceAmountSnapshot ??
      selectedItem?.order?.priceAmountSnapshot,
  });
  const { platformFee, creatorEarnings } =
    getCreatorPayoutFromOrderTotal(orderTotal);

  const addOnsRaw = sourceOrder?.addOnsTotalSnapshot;
  let safeAddOns = 0;
  if (typeof addOnsRaw === "number") {
    safeAddOns = Number.isFinite(addOnsRaw) ? addOnsRaw : 0;
  } else if (addOnsRaw) {
    const parsed = Number.parseFloat(String(addOnsRaw));
    safeAddOns = Number.isFinite(parsed) ? parsed : 0;
  }
  const basePayout = Math.max(0, orderTotal - safeAddOns);
  const platformFeePercent = Math.round(PLATFORM_FEE_RATE * 100);
  const addOnsCount = sourceOrder?.addOnsSnapshot?.length || 0;
  const briefOrderId = order?.id ?? selectedItem?.order?.id;

  return (
    <div
      className={
        className ??
        "bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col"
      }
    >
      <h3 className="font-bold text-sm mb-4">{title}</h3>

      <div className="space-y-3 text-sm flex-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Base Payout</span>
          <span className="font-medium text-foreground">
            {formatCreatorPayoutInr(basePayout)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Add-ons ({addOnsCount})</span>
          <span className="font-medium text-foreground">
            {formatCreatorPayoutInr(safeAddOns)}
          </span>
        </div>
        <div className="flex justify-between gap-4 pb-3 border-b border-border/40">
          <span className="text-muted-foreground">
            Platform Fee ({platformFeePercent}%)
          </span>
          <span className="font-medium text-muted-foreground">
            −{formatCreatorPayoutInr(platformFee)}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4 pt-1">
          <span className="font-bold text-foreground">Your payout</span>
          <span className="font-black text-lg text-[#22c55e]">
            {formatCreatorPayoutInr(creatorEarnings)}
          </span>
        </div>
      </div>

      {showBriefLink && briefOrderId ? (
        <div className="mt-auto pt-4">
          <Button
            variant="outline"
            className="w-full rounded-lg h-9 text-xs font-semibold border-border/50 gap-1.5"
            asChild
          >
            <Link href={`/creator/orders/${briefOrderId}/brief`}>
              View Full Brief
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
